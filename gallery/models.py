from django.db import models


class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class ImageItem(models.Model):
    title = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    image = models.FileField(upload_to="gallery/")
    tags = models.ManyToManyField(Tag, related_name="images", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
