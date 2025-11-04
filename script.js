/* -----------------------------
   Firebase Setup
----------------------------- */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

/* -----------------------------
   Firebase Config
----------------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyCbzEw-EpNrUIcLeAcWxAH1PE318Bxh-5I",
  authDomain: "sebbygames-61beb.firebaseapp.com",
  projectId: "sebbygames-61beb",
  storageBucket: "sebbygames-61beb.firebasestorage.app",
  messagingSenderId: "344907692435",
  appId: "1:344907692435:web:8c4c2d716e8c180f3cd066",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* -----------------------------
   DOM Elements
----------------------------- */
const authScreen = document.getElementById("auth-screen");
const homeScreen = document.getElementById("home-screen");
const chatScreen = document.getElementById("chat-screen");
const userPopup = document.getElementById("user-popup");

const chatFab = document.getElementById("chat-fab");
const closeUserPopup = document.getElementById("close-user-popup");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const googleBtn = document.getElementById("google-btn");
const loginBtn = document.getElementById("login-btn");
const registerBtn = document.getElementById("register-btn");
const signoutBtn = document.getElementById("signout-btn");

const userList = document.getElementById("user-list");
const chatWith = document.getElementById("chat-with");
const messagesDiv = document.getElementById("messages");
const msgForm = document.getElementById("message-form");
const msgInput = document.getElementById("message-input");
const closeChat = document.getElementById("close-chat");

const homeUsername = document.getElementById("home-username");

/* -----------------------------
   Chat FAB / New Chat DOM
----------------------------- */
const chatMenu = document.getElementById("chat-menu");
const newChatBtn = document.getElementById("new-chat-btn");
const openUsersBtn = document.getElementById("open-users-btn");
const newChatModal = document.getElementById("new-chat-modal");
const startChatBtn = document.getElementById("start-chat-btn");
const cancelChatBtn = document.getElementById("cancel-chat-btn");
const newChatEmailInput = document.getElementById("new-chat-email");

/* -----------------------------
   State
----------------------------- */
let currentChatUser = null;
let unsubscribeChat = null;
let unsubscribeUsers = null;
let messageListeners = {};

/* -----------------------------
   Toast
----------------------------- */
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toast.style.background =
    type === "error" ? "#e74c3c" : type === "success" ? "#27ae60" : "#0078ff";
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 100);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

/* -----------------------------
   Auth
----------------------------- */
async function handleLogin() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) return showToast("Enter email and password", "error");
  try {
    await signInWithEmailAndPassword(auth, email, password);
    showToast("Logged in successfully!", "success");
  } catch (e) {
    showToast(e.message, "error");
  }
}

async function handleRegister() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) return showToast("Enter email and password", "error");

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", auth.currentUser.uid), {
      email,
      online: true,
      lastSeen: serverTimestamp(),
      lastRead: {},
    });
    showToast("Account created!", "success");
  } catch (e) {
    showToast(e.message, "error");
  }
}

async function handleGoogleLogin() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    await setDoc(doc(db, "users", result.user.uid), {
      email: result.user.email,
      online: true,
      lastSeen: serverTimestamp(),
      lastRead: {},
    });
    showToast("Signed in with Google!", "success");
  } catch (e) {
    showToast(e.message, "error");
  }
}

/* -----------------------------
   ✅ Sign Out (Fixed: hides profile + resets UI)
----------------------------- */
async function handleSignOut() {
  const user = auth.currentUser;

  if (user) {
    try {
      await updateDoc(doc(db, "users", user.uid), {
        online: false,
        lastSeen: serverTimestamp(),
      });
    } catch {
      // ignore offline errors
    }
  }

  if (unsubscribeChat) unsubscribeChat();
  if (unsubscribeUsers) unsubscribeUsers();

  // ✅ Hide all app screens before signing out
  chatScreen.classList.add("hidden");
  userPopup.classList.add("hidden");
  homeScreen.classList.add("hidden");
  chatFab.classList.add("hidden");

  // ✅ Also hide profile page if visible
  const profileScreen = document.getElementById("profile-screen");
  if (profileScreen) profileScreen.classList.add("hidden");

  // ✅ Sign out and reset nav
  await signOut(auth);
  showToast("Signed out successfully", "success");

  document.querySelectorAll(".nav-item").forEach((item) =>
    item.classList.remove("active")
  );
  document.querySelector('.nav-item[data-page="home"]')?.classList.add("active");

  // ✅ Show login screen again, ensure profile doesn't overlay
  authScreen.classList.remove("hidden");
}


/* -----------------------------
   Auth State
----------------------------- */
onAuthStateChanged(auth, (user) => {
  const sidebar = document.getElementById("sidebar");
  const navToggle = document.getElementById("nav-toggle");

  if (user) {
    authScreen.classList.add("hidden");
    homeScreen.classList.remove("hidden");
    chatFab.classList.remove("hidden");

    sidebar?.classList.remove("hidden");
    navToggle?.classList.remove("hidden");

    homeUsername.textContent = user.displayName || user.email.split("@")[0];
    setOnlineStatus(user.uid, true);
    if (unsubscribeUsers) unsubscribeUsers();
    subscribeUsers(user);
  } else {
    authScreen.classList.remove("hidden");
    homeScreen.classList.add("hidden");
    chatFab.classList.add("hidden");
    chatScreen.classList.add("hidden");
    userPopup.classList.add("hidden");
  }
});

/* -----------------------------
   Online Status
----------------------------- */
function setOnlineStatus(uid, online) {
  window.addEventListener("beforeunload", () => {
    updateDoc(doc(db, "users", uid), {
      online: false,
      lastSeen: serverTimestamp(),
    }).catch(() => {});
  });
  updateDoc(doc(db, "users", uid), { online, lastSeen: serverTimestamp() }).catch(() => {});
}

/* -----------------------------
   Close All Chat UI
----------------------------- */
function closeAllChatUI() {
  [chatMenu, userPopup, chatScreen, newChatModal].forEach((el) =>
    el?.classList.add("hidden")
  );
  currentChatUser = null;
}

/* -----------------------------
   ✅ FAB directly opens Chat List + Full-Width "New Chat" (inside popup)
----------------------------- */
chatFab?.addEventListener("click", () => {
  const isOpen = userPopup && !userPopup.classList.contains("hidden");
  if (isOpen) {
    closeAllChatUI();
  } else {
    closeAllChatUI();
    userPopup?.classList.remove("hidden");
  }
});

// ✅ Add inline full-width "New Chat" button just below header
document.addEventListener("DOMContentLoaded", () => {
  if (!userPopup) return;
  const header = userPopup.querySelector(".popup-header") || userPopup.firstElementChild;
  if (!header) return;

  // Only add once
  if (!userPopup.querySelector("#inline-new-chat-btn")) {
    const inlineNewChatBtn = document.createElement("button");
    inlineNewChatBtn.id = "inline-new-chat-btn";
    inlineNewChatBtn.textContent = "➕ New Chat";
    inlineNewChatBtn.className = "inline-new-chat-btn";

    // 🔹 Full-width inside popup (not page)
    inlineNewChatBtn.style.cssText = `
      display: block;
      width: calc(100% - 24px);
      margin: 8px auto 12px auto;
      padding: 10px 14px;
      border: none;
      border-radius: 8px;
      background: var(--accent-color, #0078ff);
      color: #fff;
      font-size: 14px;
      cursor: pointer;
      text-align: center;
      transition: background 0.2s;
    `;
    inlineNewChatBtn.onmouseover = () => (inlineNewChatBtn.style.background = "#005fcc");
    inlineNewChatBtn.onmouseout = () => (inlineNewChatBtn.style.background = "var(--accent-color, #0078ff)");

    header.insertAdjacentElement("afterend", inlineNewChatBtn);

    inlineNewChatBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllChatUI();
      newChatModal?.classList.remove("hidden");
      attachCancelHandler();
    });
  }

  attachCancelHandler();
});

// ✅ Ensure Cancel button in "New Chat" modal always works
function attachCancelHandler() {
  if (!cancelChatBtn) return;

  // Remove any old event listeners by cloning
  const freshBtn = cancelChatBtn.cloneNode(true);
  cancelChatBtn.parentNode.replaceChild(freshBtn, cancelChatBtn);

  const newCancel = document.getElementById("cancel-chat-btn");
  newCancel.addEventListener("click", (e) => {
    e.stopPropagation();
    newChatModal?.classList.add("hidden");
    if (newChatEmailInput) newChatEmailInput.value = "";
    // Reopen chat list after cancel
    userPopup?.classList.remove("hidden");
  });
}

// ✅ X button in chat list still closes it
closeUserPopup?.addEventListener("click", (e) => {
  e.stopPropagation();
  closeAllChatUI();
});


/* -----------------------------
   Close Buttons
----------------------------- */
closeUserPopup?.addEventListener("click", () => userPopup.classList.add("hidden"));
closeChat?.addEventListener("click", () => {
  chatScreen.classList.add("hidden");
  currentChatUser = null;
});

/* -----------------------------
   Start New Chat
----------------------------- */
startChatBtn?.addEventListener("click", async () => {
  const queryInput = newChatEmailInput.value.trim().toLowerCase();
  if (!queryInput) return showToast("Please enter an email or name.", "error");
  const currentUser = auth.currentUser;
  if (!currentUser) return showToast("You must be logged in.", "error");

  const usersRef = collection(db, "users");
  const snapshot = await getDocs(usersRef);
  let targetUser = null;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (!data.email || docSnap.id === currentUser.uid) return;
    const email = data.email.toLowerCase();
    const displayName = (data.displayName || "").toLowerCase();
    if (
      email === queryInput ||
      displayName === queryInput ||
      email.startsWith(queryInput) ||
      displayName.startsWith(queryInput)
    )
      targetUser = { id: docSnap.id, email: data.email };
  });

  if (!targetUser) return showToast("User not found.", "error");
  closeAllChatUI();
  openChat(targetUser.id, targetUser.email);
});

/* -----------------------------
   Users List + Unread Count
----------------------------- */
function subscribeUsers(currentUser) {
  if (unsubscribeUsers) unsubscribeUsers();

  const usersCol = collection(db, "users");
  unsubscribeUsers = onSnapshot(usersCol, async (snapshot) => {
    Object.values(messageListeners).forEach((u) => {
      try {
        u();
      } catch {}
    });
    messageListeners = {};
    userList.innerHTML = "";

    for (const docSnap of snapshot.docs) {
      const user = docSnap.data();
      if (docSnap.id === currentUser.uid || !user.email) continue;

      const chatId =
        currentUser.uid < docSnap.id
          ? `${currentUser.uid}_${docSnap.id}`
          : `${docSnap.id}_${currentUser.uid}`;

      const div = document.createElement("div");
      div.className = "user-item";
      div.dataset.id = docSnap.id;
      div.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;position:relative;">
          <span>${user.displayName || user.email}</span>
          <span id="unread-${chatId}" class="unread-badge hidden">0</span>
        </div>
        <span class="status ${user.online ? "online" : "offline"}">
          ${user.online ? "● Online" : "○ Offline"}
        </span>
      `;

      div.addEventListener("click", async () => {
        userPopup.classList.add("hidden");
        openChat(docSnap.id, user.email);
      });
      userList.appendChild(div);

      const msgsRef = collection(db, "chats", chatId, "messages");
      const metaRef = doc(db, "chats", chatId, "metadata", "info");
      const msgsQuery = query(msgsRef, orderBy("createdAt"));
      let lastRead = null;

      const metaUnsub = onSnapshot(metaRef, (metaSnap) => {
        lastRead = metaSnap.exists() ? metaSnap.data().lastRead?.[currentUser.uid] : null;
      });

      const msgUnsub = onSnapshot(msgsQuery, (msgsSnap) => {
        let unread = 0;
        msgsSnap.forEach((m) => {
          const d = m.data();
          if (
            d.uid !== currentUser.uid &&
            (!lastRead || (d.createdAt && d.createdAt.toMillis() > lastRead.toMillis()))
          )
            unread++;
        });

        const badge = document.getElementById(`unread-${chatId}`);
        if (!badge) return;
        if (unread > 0 && currentChatUser !== docSnap.id) {
          badge.textContent = unread;
          badge.classList.remove("hidden");
        } else {
          badge.classList.add("hidden");
        }
      });
      messageListeners[chatId] = () => {
        metaUnsub();
        msgUnsub();
      };
    }
  });
}

/* -----------------------------
   Open Chat
----------------------------- */
async function openChat(otherUserId, otherUserEmail) {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  chatWith.textContent = `Chat with ${otherUserEmail}`;
  chatScreen.classList.remove("hidden");
  currentChatUser = otherUserId;

  const chatId =
    currentUser.uid < otherUserId
      ? `${currentUser.uid}_${otherUserId}`
      : `${otherUserId}_${currentUser.uid}`;
  const metaRef = doc(db, "chats", chatId, "metadata", "info");
  await setDoc(metaRef, { lastRead: { [currentUser.uid]: serverTimestamp() } }, { merge: true });

  const badge = document.getElementById(`unread-${chatId}`);
  if (badge) badge.classList.add("hidden");

  if (unsubscribeChat) unsubscribeChat();
  const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt"));
  unsubscribeChat = onSnapshot(q, (snapshot) => {
    messagesDiv.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();
      const div = document.createElement("div");
      div.className = msg.uid === currentUser.uid ? "msg me" : "msg";
      const time = msg.createdAt?.toDate
        ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";
      div.innerHTML = `${msg.text}<div class="msg-time">${time}</div>`;
      messagesDiv.appendChild(div);
    });
    messagesDiv.scrollTo({ top: messagesDiv.scrollHeight, behavior: "smooth" });
  });

  msgForm.onsubmit = async (e) => {
    e.preventDefault();
    const text = msgInput.value.trim();
    if (!text) return;
    await addDoc(collection(db, "chats", chatId, "messages"), {
      text,
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName || currentUser.email.split("@")[0],
      createdAt: serverTimestamp(),
    });
    msgInput.value = "";
  };
}

/* -----------------------------
   ✅ Mobile Navbar + Page Navigation (Fully Fixed)
----------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const navToggle = document.getElementById("nav-toggle");
  const sidebar = document.getElementById("sidebar");
  const navItems = document.querySelectorAll(".nav-item");
  const homeScreenLocal = document.getElementById("home-screen");
  const profileScreen = document.getElementById("profile-screen");

  if (!navToggle || !sidebar) return;

  function handleResize() {
    if (window.innerWidth <= 768) {
      sidebar.classList.add("closed");
    } else {
      sidebar.classList.remove("closed");
      navToggle.classList.remove("hidden-toggle");
    }
  }
  handleResize();
  window.addEventListener("resize", handleResize);

  // ✅ Toggle sidebar open/close
  navToggle.addEventListener("click", () => {
    sidebar.classList.toggle("closed");
    if (!sidebar.classList.contains("closed")) {
      navToggle.classList.add("hidden-toggle"); // hide burger when open
    }
  });

  // ✅ Navigation + burger behavior + page switching
  navItems.forEach((item) => {
    item.addEventListener("click", async () => {
      const page = item.getAttribute("data-page");

      // highlight current item
      navItems.forEach((i) => i.classList.remove("active"));
      item.classList.add("active");

      // hide all main sections
      if (homeScreenLocal) homeScreenLocal.classList.add("hidden");
      if (profileScreen) profileScreen.classList.add("hidden");

      // show the selected one
      if (page === "home" && homeScreenLocal) {
        homeScreenLocal.classList.remove("hidden");
      } else if (page === "profile" && profileScreen) {
        profileScreen.classList.remove("hidden");

        // ✅ load user info
        const user = auth.currentUser;
        if (user) {
          const profileEmail = document.getElementById("profile-email");
          const displayNameInput = document.getElementById("display-name-input");
          const saveNameBtn = document.getElementById("save-name-btn");

          if (profileEmail) profileEmail.textContent = user.email || "N/A";
          const name = user.displayName || user.email.split("@")[0];
          if (displayNameInput) displayNameInput.value = name;

          if (saveNameBtn) {
            saveNameBtn.disabled = true;
            saveNameBtn.style.opacity = "0.6";
            saveNameBtn.style.cursor = "not-allowed";
          }
        }
      }

      // ✅ on mobile, close sidebar and show burger again
      if (window.innerWidth <= 768) {
        sidebar.classList.add("closed");
        navToggle.classList.remove("hidden-toggle");
      }
    });
  });
});


/* -----------------------------
   Event Listeners
----------------------------- */
if (loginBtn) loginBtn.addEventListener("click", handleLogin);
if (registerBtn) registerBtn.addEventListener("click", handleRegister);
if (googleBtn) googleBtn.addEventListener("click", handleGoogleLogin);
if (signoutBtn) signoutBtn.addEventListener("click", handleSignOut);
