(function () {
    var STORAGE_KEY = "gallery_tag_catalog_v1";

    function readInitialTags() {
        var script = document.getElementById("all-tags-json");
        if (!script) return [];
        try {
            return JSON.parse(script.textContent || "[]");
        } catch (_) {
            return [];
        }
    }

    function loadCatalog() {
        var base = readInitialTags().map(function (t) { return (t || "").trim().toLowerCase(); }).filter(Boolean);
        try {
            var stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
            stored.forEach(function (t) {
                var tag = (t || "").trim().toLowerCase();
                if (tag && base.indexOf(tag) === -1) base.push(tag);
            });
        } catch (_) {}
        return base;
    }

    function saveCatalog(catalog) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog)); } catch (_) {}
    }

    function initTagInput(container) {
        var hiddenInput = container.querySelector('input[name="tags_text"]');
        var textInput = container.querySelector(".js-tags-input");
        var chipsWrap = container.querySelector(".js-tags-chips");
        var suggestionsBox = container.querySelector(".js-tags-suggestions-box");
        if (!hiddenInput || !textInput || !chipsWrap || !suggestionsBox) return;

        hiddenInput.classList.add("js-tags-hidden");

        var tags = [];
        var catalog = loadCatalog();

        function normalize(value) { return (value || "").trim().toLowerCase(); }

        function syncHidden() {
            hiddenInput.value = tags.join(", ");
        }

        function renderChips() {
            chipsWrap.innerHTML = "";
            tags.forEach(function (tag) {
                var chip = document.createElement("span");
                chip.className = "tag-chip";
                chip.textContent = tag;

                var removeBtn = document.createElement("button");
                removeBtn.type = "button";
                removeBtn.className = "tag-chip-remove";
                removeBtn.textContent = "x";
                removeBtn.addEventListener("click", function () {
                    tags = tags.filter(function (t) { return t !== tag; });
                    renderChips();
                    syncHidden();
                    renderSuggestions();
                });
                chip.appendChild(removeBtn);
                chipsWrap.appendChild(chip);
            });
        }

        function renderSuggestions() {
            var q = normalize(textInput.value);
            suggestionsBox.innerHTML = "";
            var pool = catalog.filter(function (tag) { return tags.indexOf(tag) === -1; });
            var filtered = pool.filter(function (tag) { return !q || tag.indexOf(q) !== -1; }).slice(0, 12);

            filtered.forEach(function (tag) {
                var btn = document.createElement("button");
                btn.type = "button";
                btn.className = "tag-suggestion-btn";
                btn.textContent = tag;
                btn.addEventListener("click", function () {
                    addTag(tag);
                    textInput.value = "";
                    renderSuggestions();
                    textInput.focus();
                });
                suggestionsBox.appendChild(btn);
            });

            var canCreate = q && pool.indexOf(q) === -1 && tags.indexOf(q) === -1;
            if (canCreate) {
                var createBtn = document.createElement("button");
                createBtn.type = "button";
                createBtn.className = "tag-suggestion-btn";
                createBtn.textContent = 'Create "' + q + '"';
                createBtn.addEventListener("click", function () {
                    addTag(q);
                    textInput.value = "";
                    renderSuggestions();
                    textInput.focus();
                });
                suggestionsBox.appendChild(createBtn);
            }
        }

        function addTag(raw) {
            var tag = normalize(raw);
            if (!tag) return;
            if (tags.indexOf(tag) === -1) {
                tags.push(tag);
            }
            if (catalog.indexOf(tag) === -1) {
                catalog.push(tag);
                saveCatalog(catalog);
            }
            renderChips();
            syncHidden();
        }

        (hiddenInput.value || "").split(",").forEach(function (value) {
            var tag = normalize(value);
            if (tag && tags.indexOf(tag) === -1) tags.push(tag);
        });
        renderChips();
        syncHidden();
        renderSuggestions();

        textInput.addEventListener("input", renderSuggestions);
        textInput.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                addTag(textInput.value);
                textInput.value = "";
                renderSuggestions();
            } else if (event.key === "Backspace" && !textInput.value && tags.length) {
                tags.pop();
                renderChips();
                syncHidden();
                renderSuggestions();
            }
        });

        textInput.addEventListener("blur", function () {
            if (textInput.value.trim()) {
                addTag(textInput.value);
                textInput.value = "";
                renderSuggestions();
            }
        });

        var form = container.closest("form");
        if (form) {
            form.addEventListener("submit", function () {
                if (textInput.value.trim()) {
                    addTag(textInput.value);
                    textInput.value = "";
                }
                syncHidden();
            });
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        document.querySelectorAll(".js-tag-editor").forEach(initTagInput);
    });
})();
