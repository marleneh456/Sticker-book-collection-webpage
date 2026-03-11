// --- IndexedDB Management ---
let db;
const request = indexedDB.open("StickerBookDB", 3);

request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("bookData")) {
        db.createObjectStore("bookData");
    }
};

request.onsuccess = (e) => {
    db = e.target.result;
    loadData();
};

let pages = [[]];
let zoomLevel = 1.0;
let currentPage = 0;
let isFlipping = false;
let selectedItem = null;

const page = document.getElementById("page");
const pageNumber = document.getElementById("pageNumber");
const zoomLabel = document.getElementById("zoomLabel");
const fontPanel = document.getElementById("fontPanel");
const fontSelect = document.getElementById("fontSelect");
const effectSelect = document.getElementById("effectSelect");
const colorPicker = document.getElementById("colorPicker");
const textEditBox = document.getElementById("textEditBox");
const layerPanel = document.getElementById("layerPanel");
const leftArrow = document.getElementById("leftArrow");
const rightArrow = document.getElementById("rightArrow");

function saveData() {
    if (!db) return;
    const tx = db.transaction("bookData", "readwrite");
    const store = tx.objectStore("bookData");
    // deep copy to avoid reference issues
    store.put(JSON.parse(JSON.stringify(pages)), "pages");
    store.put(zoomLevel, "zoomLevel");
}

function loadData() {
    if (!db) return;
    const tx = db.transaction("bookData", "readonly");
    const store = tx.objectStore("bookData");
    
    store.get("pages").onsuccess = (e) => {
        if (e.target.result) {
            pages = e.target.result;
            renderPage();
        }
    };
    store.get("zoomLevel").onsuccess = (e) => {
        if (e.target.result) {
            zoomLevel = e.target.result;
            updateZoom();
        }
    };
}

function updateZoom() {
    page.style.transform = `scale(${zoomLevel})`;
    zoomLabel.textContent = Math.round(zoomLevel * 100) + "%";
    saveData();
}

zoomInBtn.onclick = () => { zoomLevel = Math.round((zoomLevel + 0.1) * 10) / 10; updateZoom(); };
zoomOutBtn.onclick = () => { zoomLevel = Math.max(0.1, Math.round((zoomLevel - 0.1) * 10) / 10); updateZoom(); };

function updateArrows() {
    leftArrow.classList.toggle("disabled", currentPage === 0);
    rightArrow.classList.toggle("disabled", currentPage >= pages.length - 1);
}

function renderPage() {
    page.innerHTML = "";
    pageNumber.textContent = `Page ${currentPage + 1} / ${pages.length}`;
    if (!pages[currentPage]) pages[currentPage] = [];

    pages[currentPage].forEach((item, index) => {
        let div = document.createElement("div");
        div.className = "item";
        div.style.left = item.x + "px";
        div.style.top = item.y + "px";
        div.style.transform = `rotate(${item.rotation || 0}deg)`;

        let displayRot = Math.round((item.rotation || 0) % 360);
        if (displayRot < 0) displayRot += 360;

        if (item.type === "sticker") {
            div.style.width = item.size + "px";
            div.innerHTML = `<img src="${item.src}"><button class="deleteBtn">x</button><div class="resizeHandle"></div><div class="rotateHandle"></div><div class="rotateLabel">${displayRot}°</div>`;
        } else {
            div.classList.add("textItem");
            div.style.fontFamily = item.font;
            div.style.color = item.color;
            div.style.fontSize = item.size + "px";

            if (item.effect === "neon") {
                const c = item.effectColor || "#ff00de";
                div.style.textShadow = `0 0 5px #fff, 0 0 10px #fff, 0 0 20px ${c}, 0 0 30px ${c}`;
            } else if (item.effect === "multiShadow") {
                const s1 = item.shadowA || "#ff00de", s2 = item.shadowB || "#00d4ff", s3 = item.shadowC || "#39ff14";
                div.style.textShadow = `3px 3px 0px ${s1}, 6px 6px 0px ${s2}, 9px 9px 0px ${s3}`;
            } else if (item.effect !== "none") {
                div.classList.add("effect-" + item.effect);
            }
            div.innerHTML = `${item.text}<button class="deleteBtn">x</button><div class="resizeHandle"></div><div class="rotateHandle"></div><div class="rotateLabel">${displayRot}°</div>`;
        }
        page.appendChild(div);
        enableDrag(div, index);
        enableResize(div, index);
        enableRotate(div, index);
        enableDelete(div, index);
        enableSelect(div, index);
    });
    updateArrows();
}

function enableSelect(div, index) {
    div.onclick = (e) => {
        e.stopPropagation();
        document.querySelectorAll(".item").forEach(i => i.classList.remove("selected"));
        div.classList.add("selected");
        selectedItem = index;
        layerPanel.style.display = "block";
        let item = pages[currentPage][index];
        if (item.type === "text") {
            fontPanel.style.display = "block";
            textEditBox.value = item.text;
            document.getElementById("neonColorControls").style.display = (item.effect === "neon") ? "block" : "none";
            document.getElementById("multiShadowColorControls").style.display = (item.effect === "multiShadow") ? "block" : "none";
        } else fontPanel.style.display = "none";
    };
}

function enableDrag(div, index) {
    let ox, oy;
    div.onmousedown = (e) => {
        if (e.target.tagName === "BUTTON" || e.target.className.includes("Handle")) return;
        ox = e.offsetX; oy = e.offsetY;
        document.onmousemove = (ev) => {
            const rect = page.getBoundingClientRect();
            let x = (ev.clientX - rect.left - ox) / zoomLevel;
            let y = (ev.clientY - rect.top - oy) / zoomLevel;
            div.style.left = x + "px"; div.style.top = y + "px";
            pages[currentPage][index].x = x; pages[currentPage][index].y = y;
        };
        document.onmouseup = () => { document.onmousemove = null; saveData(); };
    };
}

function enableResize(div, index) {
    div.querySelector(".resizeHandle").onmousedown = (e) => {
        e.stopPropagation();
        document.onmousemove = (ev) => {
            let rect = div.getBoundingClientRect();
            let newSize = Math.max(20, (ev.clientX - rect.left) / zoomLevel);
            pages[currentPage][index].size = newSize;
            renderPage();
            document.querySelectorAll(".item")[index].classList.add("selected");
        };
        document.onmouseup = () => { document.onmousemove = null; saveData(); };
    };
}

function enableRotate(div, index) {
    div.querySelector(".rotateHandle").onmousedown = (e) => {
        e.stopPropagation();
        const label = div.querySelector(".rotateLabel");
        document.onmousemove = (ev) => {
            let rect = div.getBoundingClientRect();
            let cx = rect.left + rect.width / 2;
            let cy = rect.top + rect.height / 2;
            let angle = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI + 90;
            pages[currentPage][index].rotation = angle;
            div.style.transform = `rotate(${angle}deg)`;
            let d = Math.round(angle % 360); if (d < 0) d += 360;
            label.innerText = d + "°";
        };
        document.onmouseup = () => { document.onmousemove = null; saveData(); };
    };
}

function enableDelete(div, index) {
    div.querySelector(".deleteBtn").onclick = (e) => { e.stopPropagation(); pages[currentPage].splice(index, 1); renderPage(); saveData(); };
}

textEditBox.oninput = () => { if (selectedItem !== null) { pages[currentPage][selectedItem].text = textEditBox.value; renderPage(); document.querySelectorAll(".item")[selectedItem].classList.add("selected"); saveData(); } };
fontSelect.onchange = () => { if (selectedItem !== null) { pages[currentPage][selectedItem].font = fontSelect.value; renderPage(); saveData(); } };
effectSelect.onchange = () => { if (selectedItem !== null) { pages[currentPage][selectedItem].effect = effectSelect.value; renderPage(); saveData(); } };
colorPicker.oninput = () => { if (selectedItem !== null) { pages[currentPage][selectedItem].color = colorPicker.value; renderPage(); saveData(); } };

addTextBtn.onclick = () => { pages[currentPage].push({ type: "text", text: "New Text", font: "Arial", color: "#000000", x: 100, y: 100, size: 40, rotation: 0, effect: "none" }); renderPage(); saveData(); };
uploadSticker.onchange = (e) => {
    let file = e.target.files[0]; if (!file) return;
    let reader = new FileReader();
    reader.onload = () => { pages[currentPage].push({ type: "sticker", src: reader.result, x: 100, y: 100, size: 150, rotation: 0 }); renderPage(); saveData(); };
    reader.readAsDataURL(file);
};

leftArrow.onclick = () => { if (isFlipping || currentPage <= 0) return; isFlipping = true; page.classList.add("flipping-prev"); setTimeout(() => { currentPage--; renderPage(); page.classList.remove("flipping-prev"); isFlipping = false; }, 600); };
rightArrow.onclick = () => { if (isFlipping || currentPage >= pages.length - 1) return; isFlipping = true; page.classList.add("flipping-next"); setTimeout(() => { currentPage++; renderPage(); page.classList.remove("flipping-next"); isFlipping = false; }, 600); };
addPageBtn.onclick = () => { pages.push([]); currentPage = pages.length - 1; renderPage(); saveData(); };
deletePageBtn.onclick = () => { if (pages.length > 1) { pages.splice(currentPage, 1); currentPage = Math.max(0, currentPage - 1); renderPage(); saveData(); } };
openBookBtn.onclick = () => { coverScreen.style.opacity = "0"; setTimeout(() => { coverScreen.style.display = "none"; bookContainer.style.display = "block"; }, 800); };
backBtn.onclick = () => { bookContainer.style.display = "none"; coverScreen.style.display = "flex"; setTimeout(() => { coverScreen.style.opacity = "1" }, 50); };
page.onclick = () => { document.querySelectorAll(".item").forEach(i => i.classList.remove("selected")); fontPanel.style.display = "none"; layerPanel.style.display = "none"; selectedItem = null; };