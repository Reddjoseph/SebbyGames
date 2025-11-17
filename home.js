// home.js
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const auth = getAuth();
  const user = auth.currentUser;
  const usernameEl = document.getElementById("home-username");

  if (user && usernameEl) {
    usernameEl.textContent = user.displayName || user.email.split("@")[0];
  }

  console.log("🏠 Home page loaded");
});
