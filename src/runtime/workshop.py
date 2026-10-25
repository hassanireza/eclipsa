"""Eclipsa workshop: a tiny, real Django project that lives inside one Python process.

The browser worker (Pyodide) and scripts/check-levels.py (CPython) both load this exact file, so a level that
passes the checker behaves the same on the phone.

What it gives a learner's program:
  * Django 5.2 configured with an in-memory SQLite database.
  * An app called "shop". Any model the learner defines is part of it and its table is created automatically.
  * Template files kept in a dict called `templates` (name -> source), read by the normal template engine.
  * The variable `urlpatterns` the learner defines is the project's root URLconf.
  * Handy names already imported: models, forms, path, reverse, HttpResponse, Q, F, Count, ...
  * `rf` (RequestFactory) and `client` (test Client) ready to use.
"""
import builtins
import gc
import linecache
import os
import sys
import types

os.environ.setdefault("DJANGO_ALLOW_ASYNC_UNSAFE", "true")

import django
from django.conf import settings

TEMPLATE_FILES = {}
_state = {"ns": {}, "pending": [], "busy": False, "booted": False, "signals": []}
USER_FILES = ("main.py",)


class _UrlConf(types.ModuleType):
    """The project's root URLconf. Its `urlpatterns` is whatever the learner's program defined."""

    def __getattr__(self, name):
        if name == "urlpatterns":
            return _state["ns"].get("urlpatterns", [])
        raise AttributeError(name)


def boot():
    if _state["booted"]:
        return
    import tempfile
    home = tempfile.mkdtemp(prefix="eclipsa-")
    os.makedirs(os.path.join(home, "shop"), exist_ok=True)
    for name in ("__init__.py", "models.py"):
        with open(os.path.join(home, "shop", name), "w") as fh:
            fh.write("")
    sys.path.insert(0, home)
    sys.modules["workshop_urls"] = _UrlConf("workshop_urls")

    settings.configure(
        DEBUG=False,
        SECRET_KEY="eclipsa-workshop",
        ALLOWED_HOSTS=["*"],
        ROOT_URLCONF="workshop_urls",
        INSTALLED_APPS=["django.contrib.contenttypes", "django.contrib.auth", "shop"],
        DATABASES={"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}},
        TEMPLATES=[{
            "BACKEND": "django.template.backends.django.DjangoTemplates",
            "OPTIONS": {"loaders": [("django.template.loaders.locmem.Loader", TEMPLATE_FILES)]},
        }],
        USE_TZ=False, TIME_ZONE="UTC", USE_I18N=False, LANGUAGE_CODE="en-us",
        DEFAULT_AUTO_FIELD="django.db.models.BigAutoField",
        PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
        MIDDLEWARE=[], STATIC_URL="/static/",
        CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache", "LOCATION": "eclipsa"}},
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    )
    django.setup()

    from django.core.signals import request_finished, request_started
    from django.db import close_old_connections, connection
    request_started.disconnect(close_old_connections)
    request_finished.disconnect(close_old_connections)

    from django.db.models.signals import class_prepared
    class_prepared.connect(_on_prepared, weak=False, dispatch_uid="eclipsa.prepared")
    connection.execute_wrappers.append(_wrap)

    from django.contrib import admin as _admin
    _admin.site = _admin.AdminSite()  # the lazy default site wants the whole admin app installed

    _create_core()
    _state["signals"] = [(s, list(s.receivers)) for s in _watched_signals()]
    _state["booted"] = True


def _watched_signals():
    from django.core import signals as core
    from django.db.models import signals as db
    return [db.pre_init, db.post_init, db.pre_save, db.post_save, db.pre_delete, db.post_delete, db.m2m_changed,
            core.request_started, core.request_finished, core.got_request_exception]


# ---------------------------------------------------------------- tables for the learner's models

def _wanted(model):
    meta = model._meta
    return not (meta.abstract or meta.proxy or meta.swapped or not meta.managed or meta.auto_created)


def _resolved(model):
    fields = list(model._meta.local_fields) + list(model._meta.local_many_to_many)
    for f in fields:
        rel = getattr(f, "remote_field", None)
        if rel is None:
            continue
        if isinstance(rel.model, str):
            return False
        if isinstance(f, django_m2m()):
            through = getattr(rel, "through", None)
            if through is None or isinstance(through, str):
                return False
            if not through._meta.auto_created:
                continue
        else:
            through = None
        if through is not None:
            for g in through._meta.local_fields:
                r2 = getattr(g, "remote_field", None)
                if r2 is not None and isinstance(r2.model, str):
                    return False
    return True


def django_m2m():
    from django.db.models import ManyToManyField
    return ManyToManyField


def _on_prepared(sender, **kwargs):
    if sender._meta.app_label != "shop":
        return
    if _wanted(sender):
        _state["pending"].append(sender)
    _flush()


def _wrap(execute, sql, params, many, context):
    if _state["pending"] and not _state["busy"]:
        _flush()
    return execute(sql, params, many, context)


def _flush():
    from django.db import connection
    if _state["busy"] or connection.in_atomic_block:
        return
    _state["busy"] = True
    try:
        todo = [m for m in _state["pending"] if _resolved(m)]
        if not todo:
            return
        with connection.schema_editor() as editor:
            for m in todo:
                editor.create_model(m)
        _state["pending"] = [m for m in _state["pending"] if m not in todo]
    except Exception:
        pass
    finally:
        _state["busy"] = False


def _create_core():
    from django.contrib.auth.models import Group, Permission, User
    from django.contrib.contenttypes.models import ContentType
    from django.db import connection
    with connection.schema_editor() as editor:
        for m in (ContentType, Permission, Group, User):
            editor.create_model(m)


CORE_TABLES = ("auth_user_groups", "auth_user_user_permissions", "auth_group_permissions", "auth_user",
               "auth_group", "auth_permission", "django_content_type")


def _teardown():
    from django.apps import apps
    from django.core.cache import cache
    from django.db import connection
    from django.urls import clear_url_caches, set_urlconf

    try:
        if connection.in_atomic_block:
            connection.in_atomic_block = False
            connection.savepoint_ids = []
            connection.needs_rollback = False
            connection.rollback()
        connection.set_autocommit(True)
        with connection.cursor() as cur:
            cur.execute("PRAGMA foreign_keys = OFF")
            models = list(apps.all_models.get("shop", {}).values())
            tables = set()
            for m in models:
                tables.add(m._meta.db_table)
                for f in m._meta.local_many_to_many:
                    t = getattr(f.remote_field, "through", None)
                    if t is not None and not isinstance(t, str):
                        tables.add(t._meta.db_table)
            for t in tables:
                cur.execute('DROP TABLE IF EXISTS "%s"' % t)
            for t in CORE_TABLES:
                cur.execute('DELETE FROM "%s"' % t)
            cur.execute("DELETE FROM sqlite_sequence")
            cur.execute("PRAGMA foreign_keys = ON")
    except Exception:
        _hard_reset()

    apps.all_models.get("shop", {}).clear()
    apps._pending_operations.clear()
    apps.clear_cache()
    try:
        from django.contrib.contenttypes.models import ContentType
        ContentType.objects.clear_cache()
    except Exception:
        pass
    cache.clear()
    try:
        from django.contrib import admin
        admin.site._registry.clear()
    except Exception:
        pass
    TEMPLATE_FILES.clear()
    _state["pending"] = []
    for sig, saved in _state["signals"]:
        sig.receivers[:] = saved
        sig.sender_receivers_cache.clear()
    clear_url_caches()
    set_urlconf(None)
    try:
        from django.core import mail
        mail.outbox = []
    except Exception:
        pass


def _hard_reset():
    from django.db import connection
    try:
        connection.connection.close()
    except Exception:
        pass
    connection.connection = None
    connection.in_atomic_block = False
    connection.savepoint_ids = []
    connection.needs_rollback = False
    _create_core()


# ---------------------------------------------------------------- the learner's namespace

def _base_names():
    from django import forms
    from django.contrib import admin
    from django.contrib.auth import authenticate
    from django.contrib.auth.models import Group, User
    from django.core.cache import cache
    from django.core.exceptions import ObjectDoesNotExist, PermissionDenied, ValidationError
    from django.core.paginator import Paginator
    from django.db import IntegrityError, connection, models, transaction
    from django.db.models import (Avg, Case, Count, Exists, F, Max, Min, OuterRef, Prefetch, Q, Subquery, Sum,
                                  Value, When)
    from django.db.models.functions import Coalesce, Concat, Length, Lower, Upper
    from django.db.models.signals import post_delete, post_save, pre_delete, pre_save
    from django.dispatch import receiver
    from django.http import (Http404, HttpResponse, HttpResponseBadRequest, HttpResponseNotAllowed,
                             HttpResponseNotFound, HttpResponsePermanentRedirect, HttpResponseRedirect, JsonResponse)
    from django.shortcuts import get_object_or_404, redirect, render
    from django.template import Context, Template
    from django.template.loader import render_to_string
    from django.test import Client, RequestFactory
    from django.test.utils import CaptureQueriesContext
    from django.urls import include, path, re_path, resolve, reverse, reverse_lazy
    from django.utils.safestring import mark_safe
    from django.utils.text import slugify
    from django.views import View
    from django.views.decorators.http import require_GET, require_http_methods, require_POST
    from django.views.generic import DetailView, ListView, TemplateView
    names = {k: v for k, v in locals().items() if not k.startswith("_")}
    names["templates"] = TEMPLATE_FILES
    return names


def _fresh_namespace():
    ns = _base_names()
    ns["__name__"] = "shop.models"
    ns["__builtins__"] = builtins
    ns["rf"] = ns["RequestFactory"]()
    ns["client"] = ns["Client"]()
    return ns


def _format(exc, code):
    import traceback
    frames = [f for f in traceback.extract_tb(exc.__traceback__) if f.filename in USER_FILES]
    lines = []
    if isinstance(exc, SyntaxError) and exc.filename in USER_FILES:
        lines += traceback.format_exception_only(type(exc), exc)
        return "".join(lines).rstrip()
    if frames:
        lines.append("Traceback (most recent call last):\n")
        lines += traceback.format_list(frames)
    lines += traceback.format_exception_only(type(exc), exc)
    return "".join(lines).rstrip()


def run(code, setup="", test=""):
    """Run `setup` (hidden fixtures), the learner's `code`, then `test` (hidden prints) in one fresh namespace.
    Whatever they print goes to stdout. Returns None, or the formatted error text of the learner's frames."""
    boot()
    _teardown()
    ns = _fresh_namespace()
    _state["ns"] = ns
    code = code if code.endswith("\n") else code + "\n"
    linecache.cache["main.py"] = (len(code), None, code.splitlines(True), "main.py")
    try:
        if setup:
            exec(compile(setup, "given.py", "exec"), ns)
        from django.urls import clear_url_caches
        exec(compile(code, "main.py", "exec"), ns)
        _flush()
        clear_url_caches()
        if test:
            exec(compile(test, "check.py", "exec"), ns)
        return None
    except SystemExit:
        return None
    except BaseException as exc:  # noqa: BLE001  the learner's program may raise anything
        return _format(exc, code)
    finally:
        _state["ns"] = {}
        ns.clear()
        gc.collect()
