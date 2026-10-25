export type Example = { id: string; title: string; blurb: string; code: string; stdin?: string };

export const STARTER = `# Welcome to the Eclipsa terminal.
# Real Django 5.2 runs here, with an in-memory database.
# models, path, reverse, HttpResponse, rf and client are ready to use.
def hello(request):
    return HttpResponse("Hello from Django!")

urlpatterns = [path("", hello, name="hello")]

print(reverse("hello"))
print(client.get("/").content.decode())
`;

export const EXAMPLES: Example[] = [
  { id: 'hello', title: 'Hello, route', blurb: 'a view, a path and the test client', code: STARTER },
  { id: 'urls', title: 'URL converters', blurb: 'int and slug captures, reverse()', code: `def detail(request, pk):\n    return HttpResponse(f"detail {pk}")\n\ndef tag(request, slug):\n    return HttpResponse("tag " + slug)\n\nurlpatterns = [\n    path("items/<int:pk>/", detail, name="detail"),\n    path("tags/<slug:slug>/", tag, name="tag"),\n]\n\nprint(reverse("detail", args=[7]))\nprint(client.get("/items/7/").content.decode())\nprint(client.get("/tags/ember/").content.decode())\nprint(client.get("/items/abc/").status_code)\n` },
  { id: 'models', title: 'Models and the ORM', blurb: 'define, save, filter, aggregate', code: `class Book(models.Model):\n    title = models.CharField(max_length=60)\n    pages = models.IntegerField()\n\nBook.objects.bulk_create([\n    Book(title="Raven", pages=320),\n    Book(title="Lumen", pages=120),\n    Book(title="Quartz", pages=480),\n])\n\nlong_ones = Book.objects.filter(pages__gt=200).order_by("title")\nprint(list(long_ones.values_list("title", flat=True)))\nprint(Book.objects.aggregate(Sum("pages")))\n` },
  { id: 'relations', title: 'Relations', blurb: 'ForeignKey and reverse access', code: `class Author(models.Model):\n    name = models.CharField(max_length=40)\n\nclass Book(models.Model):\n    title = models.CharField(max_length=60)\n    author = models.ForeignKey(Author, on_delete=models.CASCADE, related_name="books")\n\nada = Author.objects.create(name="Ada")\nBook.objects.create(title="Notes", author=ada)\nBook.objects.create(title="Engines", author=ada)\n\nprint(ada.books.count())\nprint(sorted(ada.books.values_list("title", flat=True)))\nprint(Author.objects.annotate(n=Count("books")).values_list("name", "n")[0])\n` },
  { id: 'templates', title: 'Templates', blurb: 'filters, loops and inheritance', code: `templates["base.html"] = "<main>{% block body %}{% endblock %}</main>"\ntemplates["page.html"] = '{% extends "base.html" %}{% block body %}{% for w in words %}<li>{{ w|title }}</li>{% endfor %}{% endblock %}'\n\nprint(render_to_string("page.html", {"words": ["corona", "umbra"]}))\n` },
  { id: 'forms', title: 'Forms', blurb: 'validation and cleaned_data', code: `class Signup(forms.Form):\n    name = forms.CharField(max_length=10)\n    age = forms.IntegerField(min_value=1)\n\nform = Signup({"name": "Ada", "age": "36"})\nprint(form.is_valid(), form.cleaned_data)\n\nbad = Signup({"name": "", "age": "0"})\nprint(bad.is_valid(), dict(bad.errors.items()).keys())\n` },
  { id: 'json', title: 'A JSON endpoint', blurb: 'model, view, route and response', code: `class Note(models.Model):\n    title = models.CharField(max_length=40)\n\nNote.objects.create(title="first")\nNote.objects.create(title="second")\n\ndef notes(request):\n    return JsonResponse({"notes": list(Note.objects.values_list("title", flat=True))})\n\nurlpatterns = [path("notes/", notes)]\nprint(client.get("/notes/").json())\n` },
  { id: 'input', title: 'Ask for input()', blurb: 'uses the Input panel', code: `word = input("Slug this: ")\nprint(slugify(word))\n`, stdin: 'Moon Dust & Ash' },
  { id: 'blank', title: 'Blank page', blurb: 'start from nothing', code: '' },
];
