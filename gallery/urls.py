from django.urls import path

from .views import (
    bulk_upload_view,
    delete_image_view,
    edit_image_view,
    home_view,
    image_detail_view,
    image_modal_data_view,
    upload_view,
)

app_name = "gallery"

urlpatterns = [
    path("", home_view, name="home"),
    path("image/<int:image_id>/", image_detail_view, name="detail"),
    path("image/<int:image_id>/modal-data/", image_modal_data_view, name="modal_data"),
    path("upload/", upload_view, name="upload"),
    path("bulk-upload/", bulk_upload_view, name="bulk_upload"),
    path("edit/<int:image_id>/", edit_image_view, name="edit"),
    path("delete/<int:image_id>/", delete_image_view, name="delete"),
]
