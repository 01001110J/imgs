from django.db.models import Count, Q
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from .forms import ImageItemForm
from .models import ImageItem, Tag


def home_view(request):
    query = request.GET.get("q", "").strip()
    selected_tag_id = request.GET.get("tag", "").strip()

    images = ImageItem.objects.prefetch_related("tags").all()
    if query:
        images = images.filter(
            Q(title__icontains=query)
            | Q(description__icontains=query)
            | Q(tags__name__icontains=query)
        ).distinct()

    active_tag = None
    if selected_tag_id:
        active_tag = Tag.objects.filter(id=selected_tag_id).first()
        if active_tag:
            images = images.filter(tags=active_tag)

    context = {
        "images": images,
        "tags": Tag.objects.all(),
        "query": query,
        "active_tag": active_tag,
    }
    return render(request, "gallery/home.html", context)


def image_detail_view(request, image_id):
    image = get_object_or_404(ImageItem.objects.prefetch_related("tags"), id=image_id)
    tag_ids = list(image.tags.values_list("id", flat=True))

    similar_images = (
        ImageItem.objects.exclude(id=image.id)
        .filter(tags__id__in=tag_ids)
        .annotate(shared_tags=Count("tags", filter=Q(tags__id__in=tag_ids)))
        .order_by("-shared_tags", "-created_at")
        .distinct()[:8]
    )

    context = {
        "image": image,
        "similar_images": similar_images,
    }
    return render(request, "gallery/detail.html", context)


def upload_view(request):
    if request.method == "POST":
        form = ImageItemForm(request.POST, request.FILES)
        if form.is_valid():
            image = form.save()
            return redirect("gallery:detail", image_id=image.id)
    else:
        form = ImageItemForm()

    context = {
        "form": form,
        "tag_names": Tag.objects.values_list("name", flat=True),
        "mode": "create",
    }
    return render(request, "gallery/upload.html", context)


def edit_image_view(request, image_id):
    image = get_object_or_404(ImageItem, id=image_id)

    if request.method == "POST":
        form = ImageItemForm(request.POST, request.FILES, instance=image)
        if form.is_valid():
            form.save()
            return redirect("gallery:detail", image_id=image.id)
    else:
        form = ImageItemForm(instance=image)

    context = {
        "form": form,
        "image": image,
        "tag_names": Tag.objects.values_list("name", flat=True),
        "mode": "edit",
    }
    return render(request, "gallery/upload.html", context)


@require_POST
def delete_image_view(request, image_id):
    image = get_object_or_404(ImageItem, id=image_id)
    image.delete()
    return redirect("gallery:home")
