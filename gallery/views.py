from django.db.models import Count, Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from .forms import ImageItemForm
from .models import ImageItem, Tag


def _apply_tags(image, tags_raw):
    tag_names = [name.strip().lower() for name in (tags_raw or "").split(",") if name.strip()]
    tags = []
    for tag_name in tag_names:
        tag, _ = Tag.objects.get_or_create(name=tag_name)
        tags.append(tag)
    image.tags.set(tags)


def _similar_images_qs(image, limit=None):
    tag_ids = list(image.tags.values_list("id", flat=True))
    qs = (
        ImageItem.objects.exclude(id=image.id)
        .filter(tags__id__in=tag_ids)
        .annotate(shared_tags=Count("tags", filter=Q(tags__id__in=tag_ids)))
        .order_by("-shared_tags", "-created_at")
        .distinct()
    )
    if limit is not None:
        return qs[:limit]
    return qs


def home_view(request):
    query = request.GET.get("q", "").strip()
    selected_tag_ids = list(request.GET.getlist("tags"))
    legacy_tag = request.GET.get("tag", "").strip()
    if legacy_tag:
        selected_tag_ids.append(legacy_tag)
    selected_tag_ids = [str(t) for t in selected_tag_ids if str(t).strip()]

    images = ImageItem.objects.prefetch_related("tags").all()
    if query:
        images = images.filter(
            Q(title__icontains=query)
            | Q(description__icontains=query)
            | Q(tags__name__icontains=query)
        ).distinct()

    selected_tags = list(Tag.objects.filter(id__in=selected_tag_ids))
    for tag in selected_tags:
        images = images.filter(tags=tag)

    context = {
        "images": images,
        "tags": Tag.objects.all(),
        "query": query,
        "selected_tag_ids": {str(tag.id) for tag in selected_tags},
        "selected_tags": selected_tags,
    }
    return render(request, "gallery/home.html", context)


def image_detail_view(request, image_id):
    image = get_object_or_404(ImageItem.objects.prefetch_related("tags"), id=image_id)
    similar_images = _similar_images_qs(image, limit=8)

    context = {
        "image": image,
        "similar_images": similar_images,
    }
    return render(request, "gallery/detail.html", context)


def image_modal_data_view(request, image_id):
    image = get_object_or_404(ImageItem.objects.prefetch_related("tags"), id=image_id)
    try:
        offset = int(request.GET.get("offset", "0"))
    except ValueError:
        offset = 0
    try:
        limit = int(request.GET.get("limit", "12"))
    except ValueError:
        limit = 12
    offset = max(offset, 0)
    limit = min(max(limit, 1), 40)

    base_qs = _similar_images_qs(image, limit=None)
    similar_images = list(base_qs[offset : offset + limit])
    total_similar = base_qs.count()
    return JsonResponse(
        {
            "id": image.id,
            "image_url": image.image.url,
            "description": image.description or "",
            "tags": [{"id": tag.id, "name": tag.name} for tag in image.tags.all()],
            "similar": [
                {
                    "id": item.id,
                    "image_url": item.image.url,
                    "description": item.description or "",
                }
                for item in similar_images
            ],
            "has_more": (offset + len(similar_images)) < total_similar,
            "next_offset": offset + len(similar_images),
        }
    )


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
        "all_tag_names": list(Tag.objects.order_by("name").values_list("name", flat=True)),
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
        "all_tag_names": list(Tag.objects.order_by("name").values_list("name", flat=True)),
        "mode": "edit",
    }
    return render(request, "gallery/upload.html", context)


def bulk_upload_view(request):
    if request.method == "POST":
        files = request.FILES.getlist("images")
        descriptions = request.POST.getlist("descriptions[]")
        tags_list = request.POST.getlist("tags[]")

        created_ids = []
        for index, file in enumerate(files):
            description = (descriptions[index] if index < len(descriptions) else "").strip()
            tags_raw = tags_list[index] if index < len(tags_list) else ""

            image = ImageItem.objects.create(title="", description=description, image=file)
            _apply_tags(image, tags_raw)
            created_ids.append(image.id)

        if created_ids:
            return redirect("gallery:detail", image_id=created_ids[-1])
        return redirect("gallery:bulk_upload")

    context = {
        "all_tag_names": list(Tag.objects.order_by("name").values_list("name", flat=True)),
    }
    return render(request, "gallery/bulk_upload.html", context)


@require_POST
def delete_image_view(request, image_id):
    image = get_object_or_404(ImageItem, id=image_id)
    image.delete()
    return redirect("gallery:home")
