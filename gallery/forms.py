from django import forms

from .models import ImageItem, Tag


class ImageItemForm(forms.ModelForm):
    tags_text = forms.CharField(required=False, label="Tags")

    class Meta:
        model = ImageItem
        fields = ["title", "description", "image", "tags_text"]
        labels = {
            "title": "Titulo (opcional)",
            "description": "Descripcion (opcional)",
            "image": "Imagen",
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["title"].required = False
        self.fields["image"].required = False
        self.fields["image"].widget.attrs.update(
            {
                "id": "id_image_file",
                "class": "native-file-input",
            }
        )

        if self.instance and self.instance.pk:
            self.fields["tags_text"].initial = ", ".join(
                self.instance.tags.order_by("name").values_list("name", flat=True)
            )

    def clean_title(self):
        return (self.cleaned_data.get("title") or "").strip()

    def save(self, commit=True):
        item = super().save(commit=commit)
        tags_raw = self.cleaned_data.get("tags_text", "")
        tag_names = [name.strip().lower() for name in tags_raw.split(",") if name.strip()]

        tag_objects = []
        for tag_name in tag_names:
            tag, _ = Tag.objects.get_or_create(name=tag_name)
            tag_objects.append(tag)

        item.tags.set(tag_objects)
        return item
