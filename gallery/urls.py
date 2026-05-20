from django.urls import path

from .views import delete_image_view, edit_image_view, gallery_view

app_name = "gallery"

urlpatterns = [
    path("", gallery_view, name="index"),
    path("editar/<int:image_id>/", edit_image_view, name="edit"),
    path("eliminar/<int:image_id>/", delete_image_view, name="delete"),
]
