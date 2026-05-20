from django.db.models import Q
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from .forms import ImageItemForm
from .models import ImageItem, Tag


def gallery_view(request):
    if request.method == "POST":
        form = ImageItemForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            return redirect("gallery:index")
    else:
        form = ImageItemForm()

    query = request.GET.get("q", "").strip()
    selected_tag_ids = request.GET.getlist("tags")

    images = ImageItem.objects.prefetch_related("tags").all()

    if query:
        images = images.filter(
            Q(title__icontains=query)
            | Q(description__icontains=query)
            | Q(tags__name__icontains=query)
        ).distinct()

    selected_tags = Tag.objects.filter(id__in=selected_tag_ids)
    for tag in selected_tags:
        images = images.filter(tags=tag)

    all_tags = Tag.objects.all()
    context = {
        "form": form,
        "images": images,
        "tags": all_tags,
        "tag_names": all_tags.values_list("name", flat=True),
        "query": query,
        "selected_tag_ids": {str(tag_id) for tag_id in selected_tag_ids},
    }
    return render(request, "gallery/index.html", context)


def edit_image_view(request, image_id):
    image = get_object_or_404(ImageItem, id=image_id)

    if request.method == "POST":
        form = ImageItemForm(request.POST, request.FILES, instance=image)
        if form.is_valid():
            form.save()
            return redirect("gallery:index")
    else:
        form = ImageItemForm(instance=image)

    context = {
        "form": form,
        "image": image,
        "tag_names": Tag.objects.values_list("name", flat=True),
    }
    return render(request, "gallery/edit.html", context)


@require_POST
def delete_image_view(request, image_id):
    image = get_object_or_404(ImageItem, id=image_id)
    image.delete()
    return redirect("gallery:index")
