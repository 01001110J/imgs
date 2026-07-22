from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse

from .models import ImageItem


@override_settings(GALLERY_HOME_IMAGE_LIMIT=100)
class HomeViewTests(TestCase):
    def test_home_limits_initial_gallery_to_first_100_images(self):
        for index in range(105):
            ImageItem.objects.create(
                image=SimpleUploadedFile(
                    f"image-{index}.jpg",
                    b"image-bytes",
                    content_type="image/jpeg",
                )
            )

        response = self.client.get(reverse("gallery:home"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.context["images"]), 100)
