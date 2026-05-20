(function () {
    function normalizeTag(value) {
        return value.trim().toLowerCase();
    }

    function initTagInput(container) {
        var hiddenInput = container.querySelector('input[name="tags_text"]');
        var textInput = container.querySelector(".js-tags-input");
        var chipsWrap = container.querySelector(".js-tags-chips");
        var suggestions = container.querySelector(".js-tags-suggestions");
        if (!hiddenInput || !textInput || !chipsWrap) return;

        hiddenInput.classList.add("js-tags-hidden");

        var tags = [];

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
                });

                chip.appendChild(removeBtn);
                chipsWrap.appendChild(chip);
            });
        }

        function addTag(raw) {
            var tag = normalizeTag(raw);
            if (tag && !tags.includes(tag)) {
                tags.push(tag);
                renderChips();
                syncHidden();
            }
        }

        (hiddenInput.value || "").split(",").forEach(function (value) {
            var tag = normalizeTag(value);
            if (tag && !tags.includes(tag)) tags.push(tag);
        });
        renderChips();
        syncHidden();

        textInput.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                addTag(textInput.value);
                textInput.value = "";
            } else if (event.key === "Backspace" && !textInput.value && tags.length) {
                tags.pop();
                renderChips();
                syncHidden();
            }
        });

        textInput.addEventListener("blur", function () {
            if (textInput.value.trim()) {
                addTag(textInput.value);
                textInput.value = "";
            }
        });

        if (suggestions) {
            textInput.setAttribute("list", suggestions.id);
        }

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
