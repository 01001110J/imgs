(function () {
    var fileInput = document.getElementById("id_image_file");
    var dropZone = document.getElementById("drop-zone");
    var pickFile = document.getElementById("pick-file");

    if (dropZone && fileInput) {
        if (pickFile) {
            pickFile.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                fileInput.click();
            });
        }

        function attachFile(file) {
            if (typeof DataTransfer === "undefined") return;
            var dt = new DataTransfer();
            dt.items.add(file);
            fileInput.files = dt.files;
            var text = dropZone.querySelector(".drop-big");
            if (text) text.textContent = file.name;
        }

        ["dragenter", "dragover"].forEach(function (eventName) {
            dropZone.addEventListener(eventName, function (event) {
                event.preventDefault();
                dropZone.classList.add("is-dragover");
            });
        });

        ["dragleave", "drop"].forEach(function (eventName) {
            dropZone.addEventListener(eventName, function (event) {
                event.preventDefault();
                dropZone.classList.remove("is-dragover");
            });
        });

        dropZone.addEventListener("drop", function (event) {
            var file = event.dataTransfer.files && event.dataTransfer.files[0];
            if (file) attachFile(file);
        });

        fileInput.addEventListener("change", function () {
            var file = fileInput.files && fileInput.files[0];
            if (file) {
                var text = dropZone.querySelector(".drop-big");
                if (text) text.textContent = file.name;
            }
        });
    }
})();

(function () {
    var draggableImages = document.querySelectorAll("img[data-drag-url]");
    draggableImages.forEach(function (img) {
        img.addEventListener("dragstart", function (event) {
            var raw = img.getAttribute("data-drag-url");
            var absolute = new URL(raw, window.location.origin).toString();
            event.dataTransfer.setData("text/uri-list", absolute);
            event.dataTransfer.setData("text/plain", absolute);
            event.dataTransfer.effectAllowed = "copy";
        });
    });
})();

(function () {
    async function copyImage(url, button) {
        var absolute = new URL(url, window.location.origin).toString();
        try {
            var response = await fetch(absolute, { credentials: "same-origin" });
            var blob = await response.blob();

            if (navigator.clipboard && window.ClipboardItem) {
                await navigator.clipboard.write([
                    new ClipboardItem({ [blob.type || "image/png"]: blob })
                ]);
                button.textContent = "Copied";
            } else {
                await navigator.clipboard.writeText(absolute);
                button.textContent = "URL Copied";
            }
        } catch (error) {
            try {
                await navigator.clipboard.writeText(absolute);
                button.textContent = "URL Copied";
            } catch (_) {
                button.textContent = "Failed";
            }
        }

        setTimeout(function () {
            button.textContent = "Copy";
        }, 1200);
    }

    document.addEventListener("click", function (event) {
        var button = event.target.closest(".copy-image-btn, .modal-copy-btn");
        if (!button) return;
        event.preventDefault();
        event.stopPropagation();
        copyImage(button.getAttribute("data-copy-image"), button);
    });
})();

(function () {
    var form = document.getElementById("bulk-upload-form");
    var input = document.getElementById("bulk-images-input");
    var dropZone = document.getElementById("bulk-drop-zone");
    var pickFile = document.getElementById("bulk-pick-file");
    var modal = document.getElementById("bulk-modal");
    var preview = document.getElementById("bulk-current-preview");
    var stepLabel = document.getElementById("bulk-step-label");
    var descriptionInput = document.getElementById("bulk-description-input");
    var hiddenFields = document.getElementById("bulk-hidden-fields");
    var overflowNote = document.getElementById("bulk-overflow-note");
    var prevBtn = document.getElementById("bulk-prev-btn");
    var nextBtn = document.getElementById("bulk-next-btn");
    var finishBtn = document.getElementById("bulk-finish-btn");
    var cancelBtn = document.getElementById("bulk-cancel-btn");
    var removeBtn = document.getElementById("bulk-remove-btn");
    var tagEditor = document.getElementById("bulk-tag-editor");
    var tagsInput = tagEditor ? tagEditor.querySelector(".js-bulk-tags-input") : null;
    var tagChips = tagEditor ? tagEditor.querySelector(".js-bulk-tag-chips") : null;
    var tagSuggestions = tagEditor ? tagEditor.querySelector(".js-bulk-tags-suggestions-box") : null;

    if (!form || !input || !dropZone || !modal || !preview || !hiddenFields || !tagsInput || !tagChips || !tagSuggestions) return;

    var files = [];
    var items = [];
    var currentIndex = 0;

    function normalizeTag(value) {
        return (value || "").trim().toLowerCase();
    }

    function setInputFiles(fileList) {
        if (typeof DataTransfer === "undefined") return;
        var dt = new DataTransfer();
        fileList.forEach(function (file) { dt.items.add(file); });
        input.files = dt.files;
    }

    function setModalOpen(isOpen) {
        if (isOpen) {
            modal.classList.add("is-open");
            modal.setAttribute("aria-hidden", "false");
            document.body.style.overflow = "hidden";
        } else {
            modal.classList.remove("is-open");
            modal.setAttribute("aria-hidden", "true");
            document.body.style.overflow = "";
        }
    }

    function parseCatalog() {
        var script = document.getElementById("all-tags-json");
        if (!script) return [];
        try {
            return (JSON.parse(script.textContent || "[]") || []).map(normalizeTag).filter(Boolean);
        } catch (_) {
            return [];
        }
    }

    var catalog = parseCatalog();

    function renderTagEditor() {
        var item = items[currentIndex];
        tagChips.innerHTML = "";
        item.tags.forEach(function (tag) {
            var chip = document.createElement("span");
            chip.className = "tag-chip";
            chip.textContent = tag;
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "tag-chip-remove";
            btn.textContent = "x";
            btn.addEventListener("click", function () {
                item.tags = item.tags.filter(function (t) { return t !== tag; });
                renderTagEditor();
            });
            chip.appendChild(btn);
            tagChips.appendChild(chip);
        });

        var query = normalizeTag(tagsInput.value);
        var pool = catalog.filter(function (tag) { return item.tags.indexOf(tag) === -1; });
        var options = pool.filter(function (tag) { return !query || tag.indexOf(query) !== -1; }).slice(0, 12);
        tagSuggestions.innerHTML = "";
        options.forEach(function (tag) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "tag-suggestion-btn";
            btn.textContent = tag;
            btn.addEventListener("click", function () {
                if (item.tags.indexOf(tag) === -1) item.tags.push(tag);
                tagsInput.value = "";
                renderTagEditor();
            });
            tagSuggestions.appendChild(btn);
        });
    }

    function addTagFromInput() {
        var tag = normalizeTag(tagsInput.value);
        if (!tag) return;
        var item = items[currentIndex];
        if (item.tags.indexOf(tag) === -1) item.tags.push(tag);
        if (catalog.indexOf(tag) === -1) catalog.push(tag);
        tagsInput.value = "";
        renderTagEditor();
    }

    function renderStep() {
        if (!items.length) return;
        var item = items[currentIndex];
        preview.src = item.preview;
        stepLabel.textContent = (currentIndex + 1) + " / " + items.length;
        descriptionInput.value = item.description || "";
        tagsInput.value = "";
        renderTagEditor();
        if (prevBtn) prevBtn.disabled = currentIndex === 0;
        if (nextBtn) nextBtn.style.display = currentIndex === items.length - 1 ? "none" : "";
        if (finishBtn) finishBtn.style.display = currentIndex === items.length - 1 ? "" : "none";
    }

    function persistStep() {
        if (!items.length) return;
        items[currentIndex].description = (descriptionInput.value || "").trim();
        if (tagsInput.value.trim()) addTagFromInput();
    }

    function buildHiddenFields() {
        hiddenFields.innerHTML = "";
        items.forEach(function (item) {
            var desc = document.createElement("input");
            desc.type = "hidden";
            desc.name = "descriptions[]";
            desc.value = item.description || "";
            hiddenFields.appendChild(desc);

            var tags = document.createElement("input");
            tags.type = "hidden";
            tags.name = "tags[]";
            tags.value = (item.tags || []).join(", ");
            hiddenFields.appendChild(tags);
        });
    }

    function startBulk(newFiles) {
        var limited = newFiles.slice(0, 200);
        if (overflowNote) {
            overflowNote.textContent = newFiles.length > 200 ? "Only the first 200 files were kept." : "";
        }
        files = limited;
        items = files.map(function (file) {
            return { file: file, preview: URL.createObjectURL(file), description: "", tags: [] };
        });
        currentIndex = 0;
        setInputFiles(files);
        renderStep();
        setModalOpen(true);
    }

    function finishBulk() {
        persistStep();
        buildHiddenFields();
        setModalOpen(false);
        form.submit();
    }

    if (pickFile) {
        pickFile.addEventListener("click", function (event) {
            event.preventDefault();
            input.click();
        });
    }

    input.addEventListener("change", function () {
        var selected = Array.prototype.slice.call(input.files || []);
        if (selected.length) startBulk(selected);
    });

    ["dragenter", "dragover"].forEach(function (eventName) {
        dropZone.addEventListener(eventName, function (event) {
            event.preventDefault();
            dropZone.classList.add("is-dragover");
        });
    });

    ["dragleave", "drop"].forEach(function (eventName) {
        dropZone.addEventListener(eventName, function (event) {
            event.preventDefault();
            dropZone.classList.remove("is-dragover");
        });
    });

    dropZone.addEventListener("drop", function (event) {
        var dropped = Array.prototype.slice.call((event.dataTransfer && event.dataTransfer.files) || []);
        if (dropped.length) startBulk(dropped);
    });

    if (prevBtn) {
        prevBtn.addEventListener("click", function () {
            if (!items.length || currentIndex === 0) return;
            persistStep();
            currentIndex -= 1;
            renderStep();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", function () {
            if (!items.length || currentIndex >= items.length - 1) return;
            persistStep();
            currentIndex += 1;
            renderStep();
        });
    }

    if (finishBtn) finishBtn.addEventListener("click", finishBulk);

    if (cancelBtn) {
        cancelBtn.addEventListener("click", function () {
            setModalOpen(false);
        });
    }

    if (removeBtn) {
        removeBtn.addEventListener("click", function () {
            if (!items.length) return;
            items.splice(currentIndex, 1);
            files.splice(currentIndex, 1);
            if (!items.length) {
                setModalOpen(false);
                return;
            }
            if (currentIndex >= items.length) currentIndex = items.length - 1;
            setInputFiles(files);
            renderStep();
        });
    }

    tagsInput.addEventListener("input", renderTagEditor);
    tagsInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            addTagFromInput();
        }
    });
})();

(function () {
    var sidebar = document.getElementById("filter-sidebar");
    var toggle = document.getElementById("sidebar-toggle");
    var tagSearch = document.getElementById("tag-search");
    var tagsList = document.getElementById("sidebar-tags-list");
    var selectedBox = document.getElementById("selected-tags-box");
    var resizeHandle = document.getElementById("sidebar-resize-handle");

    if (sidebar && toggle) {
        toggle.addEventListener("click", function () {
            sidebar.classList.toggle("is-collapsed");
        });
    }

    if (sidebar && resizeHandle) {
        var dragging = false;
        resizeHandle.addEventListener("mousedown", function (event) {
            dragging = true;
            event.preventDefault();
        });
        document.addEventListener("mouseup", function () {
            dragging = false;
        });
        document.addEventListener("mousemove", function (event) {
            if (!dragging) return;
            var width = Math.min(460, Math.max(220, event.clientX - 8));
            sidebar.style.width = width + "px";
        });
    }

    if (tagSearch && tagsList) {
        tagSearch.addEventListener("input", function () {
            var query = (tagSearch.value || "").trim().toLowerCase();
            tagsList.querySelectorAll(".tag-item-row").forEach(function (row) {
                var name = row.getAttribute("data-tag-name") || "";
                row.style.display = !query || name.indexOf(query) !== -1 ? "" : "none";
            });
        });
    }

    if (selectedBox && tagsList) {
        selectedBox.addEventListener("click", function (event) {
            var btn = event.target.closest(".js-remove-selected-tag");
            if (!btn) return;
            var id = btn.getAttribute("data-tag-id");
            var checkbox = tagsList.querySelector('input[type="checkbox"][value="' + id + '"]');
            if (checkbox) checkbox.checked = false;
            var chip = btn.closest(".selected-tag-chip");
            if (chip) chip.remove();
        });
    }
})();

(function () {
    var modal = document.getElementById("image-modal");
    var closeBtn = document.getElementById("image-modal-close");
    var mainImage = document.getElementById("modal-main-image");
    var copyBtn = document.getElementById("modal-copy-btn");
    var editBtn = document.getElementById("modal-edit-btn");
    var description = document.getElementById("modal-description");
    var tagsBox = document.getElementById("modal-tags");
    var recommendations = document.getElementById("modal-recommendations");
    var sideScroll = document.getElementById("modal-side-scroll");
    var loading = document.getElementById("modal-loading");
    var sentinel = document.getElementById("modal-recommendations-sentinel");

    if (!modal || !mainImage || !description || !tagsBox || !recommendations || !sideScroll) return;
    var activeId = null;
    var nextOffset = 0;
    var hasMore = false;
    var isLoading = false;
    var recommendationsObserver = null;

    function openModal() {
        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
    }

    function closeModal() {
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
    }

    async function fetchChunk(imageId, offset) {
        var response = await fetch('/image/' + imageId + '/modal-data/?offset=' + offset + '&limit=12');
        if (!response.ok) return;
        return response.json();
    }

    function appendRecommendations(items) {
        items.forEach(function (item) {
            var card = document.createElement("div");
            card.className = "visual-card";

            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "open-modal-btn";
            btn.setAttribute("data-image-id", item.id);

            var img = document.createElement("img");
            img.src = item.image_url;
            img.alt = "similar";
            btn.appendChild(img);

            card.appendChild(btn);
            recommendations.appendChild(card);
        });
    }

    async function loadMoreRecommendations() {
        if (!activeId || !hasMore || isLoading) return;
        isLoading = true;
        if (loading) loading.style.display = "block";
        var data = await fetchChunk(activeId, nextOffset);
        if (data) {
            appendRecommendations(data.similar || []);
            hasMore = !!data.has_more;
            nextOffset = data.next_offset || nextOffset;
        }
        if (loading) loading.style.display = "none";
        isLoading = false;
    }

    async function fillUntilScrollable() {
        var safety = 0;
        while (hasMore && !isLoading && sideScroll.scrollHeight <= sideScroll.clientHeight + 40 && safety < 10) {
            safety += 1;
            await loadMoreRecommendations();
        }
    }

    async function loadImageData(imageId) {
        var data = await fetchChunk(imageId, 0);
        if (!data) return;
        activeId = imageId;
        nextOffset = data.next_offset || 0;
        hasMore = !!data.has_more;

        mainImage.src = data.image_url;
        if (copyBtn) copyBtn.setAttribute("data-copy-image", data.image_url);
        if (editBtn) editBtn.href = '/edit/' + imageId + '/';
        description.textContent = data.description || "No description";

        tagsBox.innerHTML = "";
        data.tags.forEach(function (tag) {
            var a = document.createElement("a");
            a.href = '/?tags=' + tag.id;
            a.className = 'chip-link';
            a.textContent = '#' + tag.name;
            tagsBox.appendChild(a);
        });

        recommendations.innerHTML = "";
        appendRecommendations(data.similar || []);
        sideScroll.scrollTop = 0;

        openModal();
        fillUntilScrollable();
    }

    document.addEventListener("click", function (event) {
        var trigger = event.target.closest(".open-modal-btn");
        if (trigger) {
            event.preventDefault();
            loadImageData(trigger.getAttribute("data-image-id"));
            return;
        }

        if (closeBtn && event.target === closeBtn) {
            closeModal();
            return;
        }

        if (event.target === modal) {
            closeModal();
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closeModal();
    });

    sideScroll.addEventListener("scroll", function () {
        if (sideScroll.scrollTop + sideScroll.clientHeight >= sideScroll.scrollHeight - 120) {
            loadMoreRecommendations();
        }
    });

    if (sentinel && "IntersectionObserver" in window) {
        recommendationsObserver = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) loadMoreRecommendations();
                });
            },
            { root: sideScroll, rootMargin: "260px 0px" }
        );
        recommendationsObserver.observe(sentinel);
    }
})();
