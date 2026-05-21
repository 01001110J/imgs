from django.db.models import Count, Q
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
