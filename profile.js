// ✅ profile.js — Email inline + reuse global toast notification

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  updateProfile,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// ✅ Use existing Firebase app from main page
const app = window.firebaseApp || initializeApp({
  apiKey: "AIzaSyCbzEw-EpNrUIcLeAcWxAH1PE318Bxh-5I",
  authDomain: "sebbygames-61beb.firebaseapp.com",
  projectId: "sebbygames-61beb",
  storageBucket: "sebbygames-61beb.firebasestorage.app",
  messagingSenderId: "344907692435",
  appId: "1:344907692435:web:8c4c2d716e8c180f3cd066",
});

const auth = window.firebaseAuth || getAuth(app);
const db = window.firebaseDB || getFirestore(app);

// ✅ DOM Elements
const emailSpan = document.getElementById("profile-email");
const nicknameDisplay = document.getElementById("nickname-display");
const nicknameInput = document.getElementById("nickname-input");
const nicknameEdit = document.getElementById("nickname-edit");
const editBtn = document.getElementById("edit-nickname-btn");
const saveBtn = document.getElementById("save-name-btn");
const cancelBtn = document.getElementById("cancel-edit-btn");
const roleSpan = document.getElementById("profile-role");
const signoutBtn = document.getElementById("signout-btn");

// ✅ Use global toast if available
const toast = window.showToast || ((msg, type) => alert(msg));

// ✅ Auth State
onAuthStateChanged(auth, (user) => {
  if (user) {
    const userEmail = user.email || "N/A";
    const nickname = user.displayName || userEmail.split("@")[0];
    const role =
      userEmail.toLowerCase() === "redjosephpogi@gmail.com" ? "Admin" : "User";

    emailSpan.textContent = userEmail;
    nicknameDisplay.textContent = nickname.slice(0, 12);
    roleSpan.textContent = role;
    roleSpan.className = "role-badge " + role.toLowerCase();
  } else {
    emailSpan.textContent = "Not signed in";
    roleSpan.textContent = "-";
    roleSpan.className = "role-badge";
  }
});

// ✅ Toggle nickname editor (with animation)
editBtn?.addEventListener("click", () => {
  const isShown = nicknameEdit.classList.contains("show");
  if (isShown) {
    nicknameEdit.classList.remove("show");
    setTimeout(() => nicknameEdit.classList.add("hidden"), 300);
  } else {
    nicknameEdit.classList.remove("hidden");
    setTimeout(() => nicknameEdit.classList.add("show"), 10);
    nicknameInput.value = nicknameDisplay.textContent.trim();
    nicknameInput.focus();
  }
});

// ✅ Save nickname
saveBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return toast("Not signed in", "error");
  const newName = nicknameInput.value.trim().slice(0, 12);
  if (!newName) return toast("Please enter a nickname", "error");

  try {
    await updateProfile(user, { displayName: newName });
    await updateDoc(doc(db, "users", user.uid), { displayName: newName });
    nicknameDisplay.textContent = newName;
    nicknameEdit.classList.remove("show");
    setTimeout(() => nicknameEdit.classList.add("hidden"), 300);
    toast("Nickname updated!", "success");
  } catch (err) {
    toast(err.message, "error");
  }
});

// ✅ Cancel edit
cancelBtn?.addEventListener("click", () => {
  nicknameEdit.classList.remove("show");
  setTimeout(() => nicknameEdit.classList.add("hidden"), 300);
});

// ✅ Sign Out
signoutBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (user) {
    try {
      await updateDoc(doc(db, "users", user.uid), {
        online: false,
        lastSeen: serverTimestamp(),
      });
    } catch {}
  }
  await signOut(auth);
  toast("Signed out successfully", "success");
  setTimeout(() => location.reload(), 1000);
});
