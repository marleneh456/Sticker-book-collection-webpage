let pages = JSON.parse(localStorage.getItem("stickerPages")) || [[]];
let zoomLevel = parseFloat(localStorage.getItem("zoomLevel")) || 1;
let currentPage = 0;
let isFlipping = false; 

const page=document.getElementById("page");
const pageNumber=document.getElementById("pageNumber");
const zoomLabel=document.getElementById("zoomLabel");
const fontPanel=document.getElementById("fontPanel");
const fontSelect=document.getElementById("fontSelect");
const effectSelect=document.getElementById("effectSelect");
const colorPicker=document.getElementById("colorPicker");
const textEditBox=document.getElementById("textEditBox");
const layerPanel=document.getElementById("layerPanel");
const leftArrow=document.getElementById("leftArrow");
const rightArrow=document.getElementById("rightArrow");

// Effect Color Pickers
const neonColorPicker = document.getElementById("neonColorPicker");
const shadowAColorPicker = document.getElementById("shadowAColorPicker");
const shadowBColorPicker = document.getElementById("shadowBColorPicker");
const neonColorControls = document.getElementById("neonColorControls");
const multiShadowColorControls = document.getElementById("multiShadowColorControls");

let selectedItem=null;

function saveData(){
    localStorage.setItem("stickerPages", JSON.stringify(pages));
    localStorage.setItem("zoomLevel", zoomLevel);
}

function updateZoom(){
    page.style.transform=`scale(${zoomLevel})`;
    zoomLabel.textContent=Math.round(zoomLevel*100)+"%";
    saveData();
}

function updateArrows() {
    leftArrow.classList.toggle("disabled", currentPage === 0);
    rightArrow.classList.toggle("disabled", currentPage === pages.length - 1);
}

zoomInBtn.onclick=()=>{ zoomLevel = Math.min(zoomLevel + 0.1, 3); updateZoom(); };
zoomOutBtn.onclick=()=>{ zoomLevel = Math.max(zoomLevel - 0.1, 0.25); updateZoom(); };

function renderPage(){
    page.innerHTML="";
    pageNumber.textContent="Page "+(currentPage+1)+" / "+pages.length;

    pages[currentPage].forEach((item,index)=>{
        let div=document.createElement("div");
        div.className="item";
        div.style.left=item.x+"px";
        div.style.top=item.y+"px";
        div.style.transform=`rotate(${item.rotation||0}deg)`;

        let displayRotation = Math.round(item.rotation % 360);
        if(displayRotation < 0) displayRotation += 360;

        if(item.type==="sticker"){
            div.style.width=item.size+"px";
            div.innerHTML=`
                <img src="${item.src}">
                <button class="deleteBtn">x</button>
                <div class="resizeHandle"></div>
                <div class="rotateHandle"></div>
                <div class="rotateLabel">${displayRotation}°</div>
            `;
        } else {
            div.classList.add("textItem");
            div.style.fontFamily=item.font;
            div.style.color=item.color;
            div.style.fontSize=item.size+"px";

            // Apply dynamic effects
            if(item.effect === "neon") {
                const c = item.effectColor || "#ff00de";
                div.style.textShadow = `0 0 5px #fff, 0 0 10px #fff, 0 0 20px ${c}, 0 0 30px ${c}, 0 0 40px ${c}`;
            } else if (item.effect === "multiShadow") {
                const sA = item.shadowA || "#ff00de";
                const sB = item.shadowB || "#00d4ff";
                div.style.textShadow = `3px 3px 0px ${sA}, 6px 6px 0px ${sB}, 9px 9px 0px #39ff14`;
            } else if (item.effect !== "none") {
                div.classList.add("effect-" + item.effect);
            }

            div.innerHTML=`
                ${item.text}
                <button class="deleteBtn">x</button>
                <div class="resizeHandle"></div>
                <div class="rotateHandle"></div>
                <div class="rotateLabel">${displayRotation}°</div>
            `;
        }

        page.appendChild(div);
        enableDrag(div,index);
        enableResize(div,index);
        enableRotate(div,index);
        enableDelete(div,index);
        enableSelect(div,index);
    });

    updateZoom();
    updateArrows();
    saveData();
}

function enableSelect(div,index){
    div.onclick=(e)=>{
        e.stopPropagation();
        document.querySelectorAll(".item").forEach(i=>i.classList.remove("selected"));
        div.classList.add("selected");
        selectedItem=index;
        layerPanel.style.display="block";
        let item=pages[currentPage][index];
        
        if(item.type==="text"){
            fontPanel.style.display="block";
            fontSelect.value=item.font;
            effectSelect.value=item.effect || "none";
            colorPicker.value=item.color;
            textEditBox.value=item.text;
            
            // Set Effect Pickers
            neonColorPicker.value = item.effectColor || "#ff00de";
            shadowAColorPicker.value = item.shadowA || "#ff00de";
            shadowBColorPicker.value = item.shadowB || "#00d4ff";
            
            updateEffectUI(item.effect);
        }else{
            fontPanel.style.display="none";
        }
    };
}

function updateEffectUI(effect) {
    neonColorControls.style.display = (effect === "neon") ? "block" : "none";
    multiShadowColorControls.style.display = (effect === "multiShadow") ? "block" : "none";
}

textEditBox.oninput=()=>{
    if(selectedItem !== null && pages[currentPage][selectedItem].type === "text") {
        pages[currentPage][selectedItem].text = textEditBox.value;
        renderPage();
        document.querySelectorAll(".item")[selectedItem].classList.add("selected");
    }
};

page.onclick=()=>{
    document.querySelectorAll(".item").forEach(i=>i.classList.remove("selected"));
    fontPanel.style.display="none";
    layerPanel.style.display="none";
    selectedItem = null;
};

frontBtn.onclick=()=>{ if(selectedItem!==null){let item=pages[currentPage].splice(selectedItem,1)[0]; pages[currentPage].push(item); renderPage();} };
backBtnLayer.onclick=()=>{ if(selectedItem!==null){let item=pages[currentPage].splice(selectedItem,1)[0]; pages[currentPage].unshift(item); renderPage();} };
forwardBtn.onclick=()=>{
    if(selectedItem !== null && selectedItem < pages[currentPage].length - 1){
        let arr=pages[currentPage];
        [arr[selectedItem], arr[selectedItem+1]] = [arr[selectedItem+1], arr[selectedItem]];
        selectedItem++; renderPage();
    }
};
backwardBtn.onclick=()=>{
    if(selectedItem !== null && selectedItem > 0){
        let arr=pages[currentPage];
        [arr[selectedItem], arr[selectedItem-1]] = [arr[selectedItem-1], arr[selectedItem]];
        selectedItem--; renderPage();
    }
};

function enableRotate(div,index){
    let handle=div.querySelector(".rotateHandle");
    let label=div.querySelector(".rotateLabel");
    handle.onmousedown=e=>{
        e.stopPropagation();
        document.onmousemove=e=>{
            let rect=div.getBoundingClientRect();
            let cx=rect.left+rect.width/2;
            let cy=rect.top+rect.height/2;
            let angle = Math.atan2(e.clientY-cy, e.clientX-cx) * 180 / Math.PI + 90;
            div.style.transform=`rotate(${angle}deg)`;
            let displayRotation = Math.round(angle % 360);
            if(displayRotation < 0) displayRotation += 360;
            label.innerText = displayRotation + "°";
            pages[currentPage][index].rotation=angle;
        };
        document.onmouseup=()=>{ document.onmousemove=null; saveData(); };
    };
}

function enableResize(div,index){
    let handle=div.querySelector(".resizeHandle");
    handle.onmousedown=e=>{
        e.stopPropagation();
        document.onmousemove=e=>{
            let rect=div.getBoundingClientRect();
            let newSize=Math.max(20, e.clientX-rect.left);
            pages[currentPage][index].size=newSize;
            renderPage();
            document.querySelectorAll(".item")[index].classList.add("selected");
        };
        document.onmouseup=()=>{ document.onmousemove=null; saveData(); };
    };
}

function enableDrag(div,index){
    let offsetX,offsetY;
    div.onmousedown=e=>{
        if(e.target.tagName==="BUTTON" || e.target.className.includes("Handle")) return;
        offsetX=e.offsetX; offsetY=e.offsetY;
        document.onmousemove=e=>{
            let x=e.pageX-offsetX; let y=e.pageY-offsetY;
            div.style.left=x+"px"; div.style.top=y+"px";
            pages[currentPage][index].x=x; pages[currentPage][index].y=y;
        };
        document.onmouseup=()=>{ document.onmousemove=null; saveData(); };
    };
}

function enableDelete(div,index){
    div.querySelector(".deleteBtn").onclick=e=>{ e.stopPropagation(); pages[currentPage].splice(index,1); renderPage(); };
}

addTextBtn.onclick=()=>{
    pages[currentPage].push({ 
        type:"text", text:"New Text", font:"Arial", color:"#000000", x:100, y:100, size:40, rotation:0, 
        effect:"none", effectColor:"#ff00de", shadowA:"#ff00de", shadowB:"#00d4ff" 
    });
    renderPage();
};

fontSelect.onchange=()=>{ if(selectedItem !== null) { pages[currentPage][selectedItem].font=fontSelect.value; renderPage(); } };

effectSelect.onchange=()=>{ 
    if(selectedItem !== null) { 
        const effect = effectSelect.value;
        pages[currentPage][selectedItem].effect = effect; 
        updateEffectUI(effect);
        renderPage(); 
    } 
};

neonColorPicker.oninput=()=>{ if(selectedItem !== null) { pages[currentPage][selectedItem].effectColor=neonColorPicker.value; renderPage(); } };
shadowAColorPicker.oninput=()=>{ if(selectedItem !== null) { pages[currentPage][selectedItem].shadowA=shadowAColorPicker.value; renderPage(); } };
shadowBColorPicker.oninput=()=>{ if(selectedItem !== null) { pages[currentPage][selectedItem].shadowB=shadowBColorPicker.value; renderPage(); } };
colorPicker.oninput=()=>{ if(selectedItem !== null) { pages[currentPage][selectedItem].color=colorPicker.value; renderPage(); } };

uploadSticker.onchange=e=>{
    let file=e.target.files[0];
    if(!file) return;
    let reader=new FileReader();
    reader.onload=()=>{
        pages[currentPage].push({ type:"sticker", src:reader.result, x:150, y:150, size:150, rotation:0 });
        renderPage();
    };
    reader.readAsDataURL(file);
};

leftArrow.onclick=()=>{
    if(isFlipping || currentPage <= 0) return;
    isFlipping = true; page.classList.add("flipping-prev");
    setTimeout(() => { currentPage--; renderPage(); page.classList.remove("flipping-prev"); isFlipping = false; }, 600);
};

rightArrow.onclick=()=>{
    if(isFlipping || currentPage >= pages.length - 1) return;
    isFlipping = true; page.classList.add("flipping-next");
    setTimeout(() => { currentPage++; renderPage(); page.classList.remove("flipping-next"); isFlipping = false; }, 600);
};

addPageBtn.onclick=()=>{ pages.push([]); currentPage=pages.length-1; renderPage(); };
deletePageBtn.onclick=()=>{ if(pages.length>1) { pages.splice(currentPage,1); currentPage = Math.max(0, currentPage-1); renderPage(); } };

openBookBtn.onclick=()=>{ coverScreen.style.opacity="0"; setTimeout(()=>{ coverScreen.style.display="none"; bookContainer.style.display="block"; renderPage(); },800); };
backBtn.onclick=()=>{ bookContainer.style.display="none"; coverScreen.style.display="flex"; setTimeout(()=>{coverScreen.style.opacity="1"},50); };

renderPage();