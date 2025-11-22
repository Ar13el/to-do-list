import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { translations } from './translations.js';

const firebaseConfig = {
    apiKey:"AIzaSyDOnCWCmkuASQyBDU645ydrIXutj4_wfq8",
    authDomain:"to-do-ecd2b.firebaseapp.com",
    projectId:"to-do-ecd2b",
    storageBucket:"to-do-ecd2b.firebasestorage.app",
    messagingSenderId:"688781168822",
    appId:"1:688781168822:web:baf48fa0de30433cfb5617",
    measurementId:"G-9XZBGPP5D0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let allTasks = [], taskToDelete = null, taskToCalendar = null, currentTab = "My Day";
let currentLang = 'en';
let currentTabBtn = null;

function setButtonTextWithSVG(buttonId, text){
    const btn = document.getElementById(buttonId);
    const svg = btn.querySelector("svg");
    btn.innerHTML = "";
    if(svg) btn.appendChild(svg);
    btn.appendChild(document.createTextNode(text));
}

function applyLanguage(){
    document.getElementById("loadingScreen").textContent = translations[currentLang].loading;

    ["myDayBtn","importantBtn","tasksBtn","myDayBtnSidebar","importantBtnSidebar","tasksBtnSidebar"].forEach(id=>{
        const btn = document.getElementById(id);
        btn.childNodes.forEach(n=>{ if(n.nodeType===3) n.remove(); });
    });

    document.getElementById("myDayBtn").insertAdjacentText("beforeend", translations[currentLang].myDay);
    document.getElementById("importantBtn").insertAdjacentText("beforeend", translations[currentLang].important);
    document.getElementById("tasksBtn").insertAdjacentText("beforeend", translations[currentLang].tasks);

    document.getElementById("myDayBtnSidebar").textContent = translations[currentLang].myDay;
    document.getElementById("importantBtnSidebar").textContent = translations[currentLang].important;
    document.getElementById("tasksBtnSidebar").textContent = translations[currentLang].tasks;

    document.getElementById("addTask").textContent = "+ " + translations[currentLang].addTask;
    document.getElementById("modalConfirm").textContent = translations[currentLang].confirmTask;
    document.getElementById("taskInput").placeholder = translations[currentLang].taskName;
    document.getElementById("taskDesc").placeholder = translations[currentLang].taskDescription;
    document.querySelector(".switch-container span").textContent = translations[currentLang].importantLabel;
    document.getElementById("modalAdd").textContent = translations[currentLang].submit;

    document.getElementById("confirmYes").textContent = translations[currentLang].yes;
    document.getElementById("confirmNo").textContent = translations[currentLang].no;
    document.querySelector("#confirmModal p").textContent = translations[currentLang].deleteConfirm;
    document.querySelector("#calendarModal p").textContent = translations[currentLang].calendarAsk;

    setButtonTextWithSVG("logoutBtn", translations[currentLang].logout);
    setButtonTextWithSVG("logoutBtnMobile", translations[currentLang].logout);
    setButtonTextWithSVG("settingsBtn", translations[currentLang].settings);

    document.querySelector("#settingsModal p").textContent = translations[currentLang].chooseLanguage;
    document.getElementById("closeSettings").textContent = translations[currentLang].close;
}

const langSelect = document.getElementById("langSelect");
const langSelectSidebar = document.getElementById("langSelectSidebar");

function applySelectStyle(select, options = {}) {
    select.style.background = options.background || "#222";
    select.style.color = options.color || "white";
    select.style.border = "none";
    select.style.borderRadius = "8px";
    select.style.padding = "8px";
    select.style.cursor = "pointer";
    select.style.fontSize = "14px";
    select.style.appearance = "none";
    select.style.webkitAppearance = "none";
    select.style.mozAppearance = "none";
    select.style.textAlignLast = "center";
}

applySelectStyle(langSelect);
applySelectStyle(langSelectSidebar, { background: "#333", color: "#fff" });

function changeLanguage(value) {
    currentLang = value;
    langSelect.value = value;
    langSelectSidebar.value = value;
    applyLanguage();
    refreshDate();
    if(currentTabBtn) currentTabBtn.click();
    const userRef = doc(db,"users",auth.currentUser.uid);
    updateDoc(userRef, { language: currentLang });
}

langSelect.addEventListener("change", e => changeLanguage(e.target.value));
langSelectSidebar.addEventListener("change", e => changeLanguage(e.target.value));

applyLanguage();

function googleCalendarDateFormat(date){
    return date.toISOString().replace(/[-:]/g,"").replace(/\.\d+/,"");
}

function openCalendarReminder(name, description, dateInput){
    let today = new Date();
    today.setHours(0,0,0,0);
    let d = dateInput.trim()==="" ? new Date() : new Date(dateInput);
    let taskDate = new Date(d);
    taskDate.setHours(0,0,0,0);
    if(taskDate.getTime() !== today.getTime()) d.setDate(d.getDate()-1);
    let start = googleCalendarDateFormat(d);
    d.setHours(d.getHours()+1);
    let end = googleCalendarDateFormat(d);
    const t = encodeURIComponent(name);
    const det = encodeURIComponent(description || "");
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${t}&details=${det}&dates=${start}/${end}`, "_blank");
}

onAuthStateChanged(auth, async user=>{
    if(!user){ window.location.href="index.html"; return; }
    const userRef = doc(db,"users",user.uid);
    const userDoc = await getDoc(userRef);
    if(userDoc.exists() && userDoc.data().language) currentLang = userDoc.data().language;
    langSelect.value = currentLang;
    langSelectSidebar.value = currentLang;
    applyLanguage();
    refreshDate();
    document.getElementById("userInfo").innerText = translations[currentLang].loggedAs + ": " + user.email;
    await loadAllTasks(user);
    currentTabBtn = document.getElementById("myDayBtn");
    currentTabBtn.click();
    document.getElementById("loadingScreen").style.opacity = 0;
    setTimeout(()=>{ document.getElementById("loadingScreen").style.display = "none"; },300);
});

async function loadAllTasks(user){
    allTasks = [];
    const snap = await getDocs(collection(db,"users",user.uid,"tasks"));
    snap.forEach(docSnap => allTasks.push({id: docSnap.id, ...docSnap.data()}));
}

function renderTasksFromCache(tab){
    const content = document.getElementById("taskList");
    content.innerHTML = "";
    const today = new Date();
    allTasks.forEach(d=>{
        if(tab === translations[currentLang].important && !d.important) return;
        if(tab === translations[currentLang].myDay){
            let assigned = d.assignedDate ? d.assignedDate.toDate() : today;
            if(assigned.toDateString() !== today.toDateString()) return;
        }
        const div = document.createElement("div");
        div.className = "task";
        const header = document.createElement("div");
        header.className = "task-header";
        const left = document.createElement("div");
        left.style.display = "flex";
        left.style.alignItems = "center";
        left.style.gap = "8px";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = d.done;
        checkbox.dataset.docId = d.id;
        const nameSpan = document.createElement("span");
        nameSpan.className = "task-name";
        nameSpan.innerText = d.name;
        left.appendChild(checkbox);
        left.appendChild(nameSpan);
        const right = document.createElement("div");
        right.className = "task-buttons";
        const assignBtn = document.createElement("button");
        assignBtn.className = "assign-calendar-btn";
        assignBtn.dataset.docId = d.id;
        assignBtn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24"><path fill="white" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-7 9H8v-2h4V7h2v4h4v2h-4v4h-2v-4z"/></svg>`;
        const del = document.createElement("img");
        del.src = "trash.svg";
        del.className = "delete-btn";
        del.dataset.docId = d.id;
        const small = document.createElement("small");
        small.innerText = (d.assignedDate ? d.assignedDate.toDate() : today).toLocaleDateString(currentLang==='es'?"es-ES":"en-US");
        const star = document.createElement("span");
        star.innerText = d.important ? "⭐" : "";
        right.appendChild(assignBtn);
        right.appendChild(small);
        right.appendChild(star);
        right.appendChild(del);
        header.appendChild(left);
        header.appendChild(right);
        const desc = document.createElement("div");
        desc.className = "task-desc";
        desc.innerText = (d.description && d.description.trim() !== "") ? d.description : translations[currentLang].noDescription;
        div.appendChild(header);
        div.appendChild(desc);
        content.appendChild(div);
        assignBtn.onclick = () => { taskToCalendar = d; document.getElementById("calendarModal").classList.add("show"); };
        div.onclick = e => {
            if(e.target !== checkbox && e.target !== del && e.target !== assignBtn){
                if(desc.style.maxHeight === "200px"){ desc.style.maxHeight="0px"; desc.style.paddingTop="0px"; }
                else{ desc.style.maxHeight="200px"; desc.style.paddingTop="8px"; }
            }
        };
        del.onclick = () => { taskToDelete = d.id; document.getElementById("confirmModal").classList.add("show"); };
        checkbox.onchange = async()=>{ await updateDoc(doc(db,"users",auth.currentUser.uid,"tasks",checkbox.dataset.docId),{done:checkbox.checked}); };
    });
}

function activateTab(tabBtn){
    if(currentTabBtn) currentTabBtn.classList.remove("active");
    tabBtn.classList.add("active");
    currentTabBtn = tabBtn;
    const tabName = tabBtn.id === "myDayBtn" || tabBtn.id === "myDayBtnSidebar" ? translations[currentLang].myDay :
                    tabBtn.id === "importantBtn" || tabBtn.id === "importantBtnSidebar" ? translations[currentLang].important :
                    translations[currentLang].tasks;
    currentTab = tabName;
    document.querySelector(".header-title").innerText = tabName;
    renderTasksFromCache(tabName);
}

document.getElementById("myDayBtn").onclick = ()=>activateTab(document.getElementById("myDayBtn"));
document.getElementById("importantBtn").onclick = ()=>activateTab(document.getElementById("importantBtn"));
document.getElementById("tasksBtn").onclick = ()=>activateTab(document.getElementById("tasksBtn"));

document.getElementById("modalAdd").onclick = async()=>{
    const name = document.getElementById("taskInput").value;
    const description = document.getElementById("taskDesc").value;
    const important = document.getElementById("importantSwitch").checked;
    const dateInput = document.getElementById("taskdate").value;
    if(name.trim().length === 0) return;
    let assignedDate = dateInput.trim() === "" ? Timestamp.fromDate(new Date()) : Timestamp.fromDate(new Date(dateInput));
    await addDoc(collection(db,"users",auth.currentUser.uid,"tasks"),{name,description,important,done:false,createdAt:serverTimestamp(),assignedDate});
    await loadAllTasks(auth.currentUser);
    currentTabBtn.click();
    document.getElementById("modal").classList.remove("show");
};

document.getElementById("modalConfirm").onclick = async()=>{
    const tasks = document.querySelectorAll(".task-header input[type=checkbox]:checked");
    for(const cb of tasks) await updateDoc(doc(db,"users",auth.currentUser.uid,"tasks",cb.dataset.docId),{done:true});
    await loadAllTasks(auth.currentUser);
    currentTabBtn.click();
};

document.getElementById("confirmYes").onclick = async()=>{
    if(taskToDelete){ await deleteDoc(doc(db,"users",auth.currentUser.uid,"tasks",taskToDelete)); await loadAllTasks(auth.currentUser); currentTabBtn.click(); }
    document.getElementById("confirmModal").classList.remove("show");
};

document.getElementById("confirmNo").onclick = ()=>{ document.getElementById("confirmModal").classList.remove("show"); taskToDelete=null; };

document.getElementById("calendarYes").onclick = ()=>{
    if(taskToCalendar){
        let dt = taskToCalendar.assignedDate ? taskToCalendar.assignedDate.toDate().toISOString().split("T")[0] : "";
        openCalendarReminder(taskToCalendar.name, taskToCalendar.description, dt);
    }
    document.getElementById("calendarModal").classList.remove("show");
};

document.getElementById("calendarNo").onclick = ()=>{
    document.getElementById("calendarModal").classList.remove("show");
    taskToCalendar=null;
};

document.getElementById("logoutBtn").onclick = async()=>{
    await signOut(auth);
    window.location.href="index.html";
};

document.getElementById('logoutBtnMobile').addEventListener('click',()=>{
    document.getElementById('logoutBtn').click();
});

document.getElementById("settingsBtn").onclick = ()=>document.getElementById("settingsModal").classList.add("show");
document.getElementById("closeSettings").onclick = ()=>document.getElementById("settingsModal").classList.remove("show");

function refreshDate(){
    const f = new Date();
    document.getElementById("date").innerText = f.toLocaleDateString(currentLang==='es'?"es-ES":"en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
}

refreshDate();

const modal = document.getElementById("modal");
document.getElementById("addTask").onclick = ()=>modal.classList.add("show");
modal.onclick = e=>{ if(e.target === modal) modal.classList.remove("show"); };
