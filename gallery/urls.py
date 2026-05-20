from django.urls import path

from .views import delete_image_view, edit_image_view, home_view, image_detail_view, upload_view

app_name = "gallery"

urlpatterns = [
    path("", home_view, name="home"),
    path("image/<int:image_id>/", image_detail_view, name="detail"),
    path("upload/", upload_view, name="upload"),
    path("edit/<int:image_id>/", edit_image_view, name="edit"),
    path("delete/<int:image_id>/", delete_image_view, name="delete"),
]
