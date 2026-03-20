import { apiBase, apiSend, loadAdminData, loadHomeData, login } from "./api.js";
import {
  escapeHtml,
  formatDate,
  formatTimeRange,
  isUpcomingEvent,
  stars,
  toBase64
} from "./utils.js";

const app = document.querySelector("#app");
const nav = document.querySelector("#mobile-nav");
const menuToggle = document.querySelector("#menu-toggle");
const snowbank = document.querySelector(".snowbank");
const logoUrl = "/assets/ppb_main.png";
const menuIconUrl = "/assets/icons/menu.svg";
const eventsIconUrl = "/assets/icons/events.svg";
const requestIconUrl = "/assets/icons/request.svg";
const facebookIconUrl = buildSocialIcon("facebook");
const instagramIconUrl = buildSocialIcon("instagram");
const xIconUrl = buildSocialIcon("x");
const tiktokIconUrl = buildSocialIcon("tiktok");
const state = {
  route: "/",
  data: null,
  adminData: null,
  adminSection: "dashboard",
  selectedPhotoId: "",
  selectedReviewId: "",
  reviewModalOpen: false,
  error: "",
  formMessage: "",
  loading: false
};

menuToggle.addEventListener("click", () => {
  nav.classList.toggle("open");
  document.body.classList.toggle("nav-open", nav.classList.contains("open"));
});

nav.addEventListener("click", (event) => {
  if (event.target instanceof HTMLAnchorElement) {
    nav.classList.remove("open");
    document.body.classList.remove("nav-open");
  }
});

createSnowflakes();
window.addEventListener("hashchange", renderRoute);
document.addEventListener("submit", handleSubmit);
document.addEventListener("click", handleClick);
window.addEventListener("resize", schedulePhotoLayout);

renderRoute();

function buildSocialIcon(kind) {
  const icons = {
    facebook:
      "<circle cx='16' cy='16' r='15' fill='%231877F2'/><path d='M18 9.5h-2.2c-2.2 0-3.8 1.6-3.8 4v2h-2v3.6h2V25h3.8v-5.9h2.8l.5-3.6h-3.3v-1.7c0-.9.4-1.5 1.5-1.5H19V9.5z' fill='white'/>",
    instagram:
      "<defs><linearGradient id='g' x1='0' y1='1' x2='1' y2='0'><stop offset='0' stop-color='%23f58529'/><stop offset='0.5' stop-color='%23dd2a7b'/><stop offset='1' stop-color='%238134af'/></linearGradient></defs><rect x='1' y='1' width='30' height='30' rx='8' fill='url(%23g)'/><rect x='8.5' y='8.5' width='15' height='15' rx='5' fill='none' stroke='white' stroke-width='2.4'/><circle cx='16' cy='16' r='3.8' fill='none' stroke='white' stroke-width='2.4'/><circle cx='22.8' cy='9.3' r='1.8' fill='white'/>",
    x: "<circle cx='16' cy='16' r='15' fill='black'/><path d='M11 9h4.2l3.2 4.5L22.1 9H25l-5.3 6.1L25.5 23h-4.2l-3.6-5-4.3 5H10.5l5.8-6.7L11 9z' fill='white'/>",
    tiktok:
      "<circle cx='16' cy='16' r='15' fill='black'/><path d='M18.8 8.2c.9 1.7 2.2 2.9 4.1 3.4v2.8c-1.4-.1-2.6-.6-3.8-1.4v5.8c0 3.2-1.9 5.4-5.2 5.4-2.8 0-4.8-1.9-4.8-4.6 0-3.1 2.3-4.9 5.8-4.5v2.7c-1.7-.2-3 .6-3 1.9 0 1.2.9 1.9 2 1.9 1.4 0 2.2-1 2.2-2.6V8.2h2.7z' fill='%2325F4EE'/><path d='M19.8 8.2c.9 1.7 2.2 2.9 4.1 3.4v2c-1.4-.1-2.6-.6-3.8-1.4v5.8c0 3.2-1.9 5.4-5.2 5.4-1 0-1.8-.2-2.6-.7 3 .3 5.1-1.8 5.1-5.2V8.2h2.4z' fill='%23FE2C55'/>"
  };

  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>${icons[kind]}</svg>`;
}

function getPhotoSrc(imageBase64) {
  if (!imageBase64) {
    return "";
  }

  if (imageBase64.startsWith("data:") || imageBase64.startsWith("/") || imageBase64.startsWith("http")) {
    return imageBase64;
  }

  return `data:image/jpeg;base64,${imageBase64}`;
}

function getRoute() {
  const hash = window.location.hash.replace(/^#/, "") || "/";
  return hash.startsWith("/") ? hash : `/${hash}`;
}

function getAdminToken() {
  return localStorage.getItem("ppb-admin-token") || "";
}

async function renderRoute() {
  state.route = getRoute();
  state.error = "";
  state.formMessage = "";
  state.selectedPhotoId = "";
  state.selectedReviewId = "";
  if (state.route !== "/") {
    state.reviewModalOpen = false;
  }
  state.loading = true;
  renderLoading();

  try {
    if (state.route === "/" || state.route === "/menu" || state.route === "/events" || state.route === "/photos") {
      state.data = await loadHomeData();
    } else if (state.route === "/admin/dashboard") {
      const token = getAdminToken();
      if (!token) {
        window.location.hash = "/admin";
        return;
      }
      state.adminData = await loadAdminData(token);
    }
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = false;
  }

  render();
}

function renderLoading() {
  app.innerHTML = `
    <section class="page">
      <div class="loading surface">
        <h2>Building the stand...</h2>
        <p class="supporting">Connecting to Purple Polar Bear at <strong>${escapeHtml(apiBase)}</strong>.</p>
      </div>
    </section>
  `;
}

function render() {
  document.body.classList.toggle("home-route", state.route === "/");

  switch (state.route) {
    case "/menu":
      app.innerHTML = renderMenuPage();
      break;
    case "/events":
      app.innerHTML = renderEventsPage();
      break;
    case "/photos":
      app.innerHTML = renderPhotosPage();
      break;
    case "/request-event":
    case "/eventrequest":
      app.innerHTML = renderRequestPage();
      break;
    case "/admin":
      app.innerHTML = renderAdminLoginPage();
      break;
    case "/admin/dashboard":
      app.innerHTML = renderAdminDashboard();
      break;
    default:
      app.innerHTML = renderHomePage();
      break;
  }

  schedulePhotoLayout();
}

let photoLayoutTimer = 0;

function schedulePhotoLayout() {
  window.clearTimeout(photoLayoutTimer);
  photoLayoutTimer = window.setTimeout(applyPhotoLayout, 40);
}

function classifyAspect(width, height) {
  if (!width || !height) {
    return "square";
  }

  const ratio = width / height;

  if (ratio <= 0.78) {
    return "portrait";
  }

  if (ratio >= 2.05) {
    return "pano";
  }

  if (ratio >= 1.45) {
    return "landscape";
  }

  return "square";
}

function applyPhotoLayout() {
  const grids = document.querySelectorAll(".gallery-grid");

  grids.forEach((grid) => {
    const gridStyle = window.getComputedStyle(grid);
    const rowSize = Number.parseFloat(gridStyle.getPropertyValue("grid-auto-rows")) || 10;
    const rowGap = Number.parseFloat(gridStyle.getPropertyValue("gap")) || 16;
    const cards = grid.querySelectorAll(".photo-card");

    cards.forEach((card) => {
      const visual = card.querySelector(".photo-visual");
      const image = card.querySelector("img");
      if (!(visual instanceof HTMLElement) || !(card instanceof HTMLElement)) {
        return;
      }

      if (!(image instanceof HTMLImageElement)) {
        visual.style.aspectRatio = "1 / 1";
        card.style.removeProperty("grid-row-end");
        return;
      }

      const updateCard = () => {
        const width = image.naturalWidth || 1;
        const height = image.naturalHeight || 1;
        visual.style.aspectRatio = `${width} / ${height}`;
        card.dataset.aspect = classifyAspect(width, height);

        // Wait one frame so card height reflects the updated aspect ratio.
        window.requestAnimationFrame(() => {
          const span = Math.max(1, Math.ceil((card.getBoundingClientRect().height + rowGap) / (rowSize + rowGap)));
          card.style.gridRowEnd = `span ${span}`;
        });
      };

      if (image.complete) {
        updateCard();
      } else {
        image.addEventListener("load", updateCard, { once: true });
      }
    });
  });
}

function renderErrorCard() {
  if (!state.error) {
    return "";
  }

  return `<div class="error-message">${escapeHtml(state.error)}</div>`;
}

function renderHomePage() {
  const data = state.data || {
    status: null,
    events: [],
    photos: [],
    reviews: [],
    about: null
  };

  const status = data.status
    ? `
      <section class="status-banner ${data.status.is_open ? "open" : "closed"}">
          <span class="status-dot" style="color:${data.status.is_open ? "#89ffb1" : "#ffb0b9"}"></span>
          <div>
            <strong>${data.status.is_open ? "Now Open" : "Currently Closed"}</strong>
            <p>${escapeHtml(data.status.message || "Check in with us for the latest stop.")}</p>
            <p class="meta">${escapeHtml(data.status.location || "Location updates coming soon")}</p>
          </div>
        </section>
      `
      : "";

  const upcoming = (data.events || []).slice(0, 3);
  const photos = data.photos || [];
  const featuredPhotos = photos.slice(0, 2);
  const reviews = data.reviews || [];
  const selectedPhoto = photos.find((photo) => photo.id === state.selectedPhotoId);
  const selectedReview = reviews.find((review) => review.id === state.selectedReviewId);

  return `
    <section class="page">
      ${renderErrorCard()}
      ${status}
      <section class="hero hero-logo-only">
        <div class="hero-logo">
          <img class="hero-logo-image" src="${logoUrl}" alt="Purple Polar Bear Snow Ball" />
        </div>
      </section>

      <section class="page card-grid">
        <div class="page">
          <a class="nav-card nav-card-link menu-feature" href="#/menu">
            <div class="menu-card-row">
              <span class="icon-badge icon-badge-menu"><img alt="Menu icon" src="${menuIconUrl}" /></span>
              <div>
                <h2>Our Delicious Menu</h2>
                <p>View all our amazing snow ball flavors and specialties.</p>
              </div>
            </div>
          </a>
          <div class="side-by-side">
            <a class="nav-card nav-card-link" href="#/events">
              <span class="icon-badge icon-badge-calendar"><img alt="Events icon" src="${eventsIconUrl}" /></span>
              <h3>Events & Locations</h3>
              <p>See where we’ll be popping up next.</p>
            </a>
            <a class="nav-card nav-card-link" href="#/request-event">
              <span class="icon-badge icon-badge-plus"><img alt="Request event icon" src="${requestIconUrl}" /></span>
              <h3>Request Event</h3>
              <p>Bring Purple Polar Bear to your school, party, or community day.</p>
            </a>
          </div>
        </div>
        <article class="info-card">
          <div class="section-heading">
            <div>
              <h2>About Us</h2>
              <p>Family-owned, event-friendly, and built to feel cheerful on mobile.</p>
            </div>
          </div>
          <p class="supporting">${escapeHtml(
            data.about?.content ||
              "Purple Polar Bear serves premium shaved ice and bold syrup flavors for neighborhoods, schools, and special events."
          )}</p>
        </article>
      </section>

      <section class="page home-detail-sections">
        <div class="section-heading">
          <div>
            <h2>📷 Event Photos</h2>
            <p>Featured moments stay here on the homepage. Open the gallery to see the full set.</p>
          </div>
          <a class="inline-button" href="#/photos">View all</a>
        </div>
        <div class="photos-grid featured-photos-grid">
          ${featuredPhotos
            .map(
              (photo) => `
                <article class="photo-card photo-button" data-action="open-photo" data-id="${photo.id}">
                  <div class="photo-visual">
                    ${
                      photo.image_base64
                        ? `<img alt="${escapeHtml(photo.title)}" src="${getPhotoSrc(photo.image_base64)}" />`
                        : `<span style="font-size:2rem">📸</span>`
                    }
                  </div>
                  <div class="photo-copy">
                    <strong>${escapeHtml(photo.title)}</strong>
                    <p class="meta">${escapeHtml(photo.event_name || "Purple Polar Bear event")}</p>
                  </div>
                </article>
              `
            )
            .join("") || `<div class="empty-state">Photos will show up here once the backend has gallery entries.</div>`}
        </div>
      </section>

      <section class="page home-detail-sections about-home-section">
        <div class="section-heading">
          <div>
            <h2>About Us</h2>
          </div>
        </div>
        <p class="about-home-copy">${escapeHtml(
          data.about?.content ||
            "Purple Polar Bear is the premier snow ball destination! We've been serving the community with premium syrups and family-owned joy for years."
        )}</p>
      </section>

      <section class="page home-detail-sections">
        <div class="section-heading">
          <div>
            <h2>⭐ Customer Reviews</h2>
            <p>Your original event preview lives here with a cleaner web layout.</p>
          </div>
        </div>
        <div class="reviews-scroll">
          <div class="reviews-grid">
            ${reviews
              .map(
                (review) => `
                  <article class="review-card review-card-button" data-action="open-review" data-id="${review.id}">
                    <div class="review-topline review-topline-stacked">
                      <h3>${escapeHtml(review.customer_name)}</h3>
                      <div class="stars" aria-label="${review.rating} out of 5 stars">${stars(review.rating)}</div>
                    </div>
                    <p class="review-quote">"${escapeHtml(review.comment || "Loved the experience.")}"</p>
                    <div class="share-row">
                      <span class="meta">Share:</span>
                      <button aria-label="Share to Facebook" class="share-button facebook" data-action="share-review" data-platform="facebook" data-name="${escapeHtml(
                        review.customer_name
                      )}" data-rating="${review.rating}" data-comment="${escapeHtml(review.comment || "")}" type="button"><img alt="" src="${facebookIconUrl}" /></button>
                      <button aria-label="Share to Instagram" class="share-button instagram" data-action="share-review" data-platform="instagram" data-name="${escapeHtml(
                        review.customer_name
                      )}" data-rating="${review.rating}" data-comment="${escapeHtml(review.comment || "")}" type="button"><img alt="" src="${instagramIconUrl}" /></button>
                      <button aria-label="Share to X" class="share-button x" data-action="share-review" data-platform="x" data-name="${escapeHtml(
                        review.customer_name
                      )}" data-rating="${review.rating}" data-comment="${escapeHtml(review.comment || "")}" type="button"><img alt="" src="${xIconUrl}" /></button>
                      <button aria-label="Share to TikTok" class="share-button tiktok" data-action="share-review" data-platform="tiktok" data-name="${escapeHtml(
                        review.customer_name
                      )}" data-rating="${review.rating}" data-comment="${escapeHtml(review.comment || "")}" type="button"><img alt="" src="${tiktokIconUrl}" /></button>
                    </div>
                  </article>
                `
              )
              .join("") || `<div class="empty-state">Reviews will appear here once approved in the admin panel.</div>`}
          </div>
        </div>
        <button class="button review-open-button review-cta-home" data-action="open-review-modal" type="button">★ Write a Review</button>
      </section>

      <section class="page home-detail-sections">
        <div class="section-heading">
          <div>
            <h2>Upcoming Events</h2>
            <p>Your original event preview lives here with a cleaner web layout.</p>
          </div>
          <a class="inline-button" href="#/events">View all</a>
        </div>
        <div class="events-grid">
          ${upcoming
            .map(
              (event) => `
                <article class="event-card">
                  <div class="pill">${escapeHtml(formatDate(event.date))}</div>
                  <h3>${escapeHtml(event.title)}</h3>
                  <p>${escapeHtml(event.description || "Catch us with cold treats and purple energy.")}</p>
                  <p class="meta">${escapeHtml(formatTimeRange(event.date))}</p>
                  <p class="meta">${escapeHtml(event.location)}</p>
                </article>
              `
            )
            .join("") || `<div class="empty-state">No upcoming events yet. Add them in the admin dashboard when the backend is ready.</div>`}
        </div>
      </section>

      <a class="footer-link" href="#/admin">Admin Login</a>
      ${renderPhotoModal(selectedPhoto)}
      ${renderReviewDetailModal(selectedReview)}
      ${renderReviewModal()}
    </section>
  `;
}

function renderMenuPage() {
  const menu = state.data?.menu || [];

  return `
    <section class="page">
      ${renderErrorCard()}
      <header class="app-page-top">
        <a class="back-link" href="#/">←</a>
        <h1>Our Menu</h1>
        <span></span>
      </header>
      <div class="page menu-page">
        <p class="screen-subtitle">Fresh Shave Ice with premium syrups!</p>
        <div class="menu-grid">
        ${menu
          .map(
            (item, index) => `
              <article class="menu-item menu-item-simple" style="background:${
                index % 2 === 0 ? "#fce1e1" : "#dff3f5"
              }">
                <div>
                  <strong>${escapeHtml(item.name)}</strong>
                  <p class="meta">${escapeHtml(flavorDescription(item.name))}</p>
                </div>
                <span class="menu-emoji">${escapeHtml(item.emoji || "🍧")}</span>
              </article>
            `
          )
          .join("") || `<div class="empty-state">No menu items yet. Add them from the admin dashboard.</div>`}
        </div>
        <div class="menu-snow-row" aria-hidden="true">❄ ❄ ❄ ❄ ❄ ❄ ❄ ❄</div>
      </div>
    </section>
  `;
}

function renderPhotosPage() {
  const photos = state.data?.photos || [];
  const selectedPhoto = photos.find((photo) => photo.id === state.selectedPhotoId);

  return `
    <section class="page">
      ${renderErrorCard()}
      <header class="app-page-top">
        <a class="back-link" href="#/">←</a>
        <h1>Event Photos</h1>
        <span></span>
      </header>
      <div class="page">
        <p class="screen-subtitle">See the full gallery from our stand, events, and community pop-ups.</p>
        <div class="photos-grid gallery-grid">
          ${photos
            .map(
              (photo) => `
                <article class="photo-card photo-button" data-action="open-photo" data-id="${photo.id}">
                  <div class="photo-visual">
                    ${
                      photo.image_base64
                        ? `<img alt="${escapeHtml(photo.title)}" src="${getPhotoSrc(photo.image_base64)}" />`
                        : `<span style="font-size:2rem">📸</span>`
                    }
                  </div>
                  <div class="photo-copy">
                    <strong>${escapeHtml(photo.title)}</strong>
                    <p class="meta">${escapeHtml(photo.event_name || "Purple Polar Bear event")}</p>
                  </div>
                </article>
              `
            )
            .join("") || `<div class="empty-state">Photos will show up here once the backend has gallery entries.</div>`}
        </div>
      </div>
      ${renderPhotoModal(selectedPhoto)}
    </section>
  `;
}

function renderEventsPage() {
  const events = state.data?.events || [];
  const upcoming = events.filter((event) => isUpcomingEvent(event.date));
  const past = events.filter((event) => !isUpcomingEvent(event.date));

  return `
    <section class="page">
      ${renderErrorCard()}
      <header class="app-page-top">
        <a class="back-link" href="#/">←</a>
        <h1>Events & Locations</h1>
        <span></span>
      </header>
      <p class="screen-subtitle">Find us around town at these upcoming events and locations</p>

      <section class="page">
        <div class="events-grid single-column">
          ${upcoming
            .map(
              (event) => `
                <article class="event-card">
                  <div class="pill">Upcoming</div>
                  <h3>${escapeHtml(event.title)}</h3>
                  <p>${escapeHtml(event.description || "We’ll be serving our signature favorites.")}</p>
                  <p class="meta">${escapeHtml(formatDate(event.date, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric"
                  }))}</p>
                  <p class="meta">${escapeHtml(formatTimeRange(event.date))}</p>
                  <p class="meta">${escapeHtml(event.location)}</p>
                </article>
              `
            )
            .join("") || `
              <div class="empty-state app-empty-state">
                <div class="empty-icon">🗓️</div>
                <h2>No events scheduled</h2>
                <p>Check back soon for upcoming locations!</p>
              </div>`}
        </div>
      </section>

      <section class="page">
        <div class="section-heading">
          <div>
            <h2>Past Events</h2>
            <p>Recent stops are still visible so the site feels lived-in.</p>
          </div>
        </div>
        <div class="events-grid">
          ${past
            .slice(0, 6)
            .map(
              (event) => `
                <article class="event-card past">
                  <div class="pill">Past</div>
                  <h3>${escapeHtml(event.title)}</h3>
                  <p class="meta">${escapeHtml(formatDate(event.date))}</p>
                  <p class="meta">${escapeHtml(formatTimeRange(event.date))}</p>
                  <p class="meta">${escapeHtml(event.location)}</p>
                </article>
              `
            )
            .join("") || `<div class="empty-state">Past events will appear once you’ve added enough history.</div>`}
        </div>
      </section>

      <section class="events-cta">
        <h2>Want us at your event?</h2>
        <p>We'd love to bring Purple Polar Bear snow balls to your special occasion!</p>
        <a class="button app-purple-button" href="#/request-event">Request Event →</a>
      </section>
    </section>
  `;
}

function renderRequestPage() {
  return `
    <section class="page">
      ${renderErrorCard()}
      <header class="app-page-top">
        <a class="back-link" href="#/">←</a>
        <h1>Request Event</h1>
        <span></span>
      </header>

      <section class="request-intro">
        <div class="request-intro-icon">🗓️</div>
        <h2>Book Purple Polar Bear for Your Event!</h2>
        <p>We'll review as soon as we can and get back to you with our availability!</p>
      </section>

      <form class="form-panel request-form-panel" data-form="event-request">
        <div class="form-grid">
          <div class="field">
            <label for="req-name">Name</label>
            <input id="req-name" name="name" required placeholder="Your full name" />
          </div>
          <div class="field">
            <label for="req-email">Email</label>
            <input id="req-email" type="email" name="email" required placeholder="you@example.com" />
          </div>
          <div class="field">
            <label for="req-phone">Phone</label>
            <input id="req-phone" name="phone" required placeholder="(555) 123-4567" />
          </div>
          <div class="field">
            <label for="req-date">Event Date</label>
            <input id="req-date" name="event_date" required placeholder="06/14/2026 or Next Saturday" />
          </div>
          <div class="field">
            <label for="req-location">Location</label>
            <input id="req-location" name="location" required placeholder="Venue or address" />
          </div>
          <div class="field">
            <label for="req-message">Details</label>
            <textarea
              id="req-message"
              name="message"
              placeholder="Guest count, preferred flavors, setup notes, or anything else helpful."
            ></textarea>
          </div>
        </div>
        <button class="button app-purple-button" type="submit">➤ Submit Request</button>
      </form>
    </section>
  `;
}

function renderAdminLoginPage() {
  return `
    <section class="page">
      ${renderErrorCard()}
      <header class="page-header">
        <span class="eyebrow">Content management</span>
        <h1>Admin Login</h1>
        <p>The secure portal is preserved so all sections remain manageable through the web rebuild too.</p>
      </header>

      <form class="form-panel" data-form="admin-login">
        <div class="form-grid">
          <div class="field">
            <label for="admin-user">Username</label>
            <input id="admin-user" name="username" required placeholder="Username" />
          </div>
          <div class="field">
            <label for="admin-pass">Password</label>
            <input id="admin-pass" type="password" name="password" required placeholder="Password" />
          </div>
        </div>
        <button class="button" type="submit">Log In</button>
      </form>
    </section>
  `;
}

function renderPhotoModal(selectedPhoto) {
  if (!selectedPhoto) {
    return "";
  }

  return `
    <div class="modal-backdrop">
      <div class="modal-card modal-photo" role="dialog" aria-modal="true">
        <button class="modal-close" data-action="close-photo" type="button">×</button>
        ${
          selectedPhoto.image_base64
            ? `<img alt="${escapeHtml(selectedPhoto.title)}" src="${getPhotoSrc(selectedPhoto.image_base64)}" />`
            : ""
        }
        <div class="photo-copy">
          <strong>${escapeHtml(selectedPhoto.title)}</strong>
          <p class="meta">${escapeHtml(selectedPhoto.event_name || "")}</p>
        </div>
      </div>
    </div>
  `;
}

function renderReviewDetailModal(selectedReview) {
  if (!selectedReview) {
    return "";
  }

  return `
    <div class="modal-backdrop">
      <div class="modal-card modal-review-detail" role="dialog" aria-modal="true">
        <button class="modal-close" data-action="close-review-detail" type="button">×</button>
        <div class="review-topline review-topline-stacked">
          <h3>${escapeHtml(selectedReview.customer_name)}</h3>
          <div class="stars" aria-label="${selectedReview.rating} out of 5 stars">${stars(selectedReview.rating)}</div>
        </div>
        <p class="review-quote review-quote-large">"${escapeHtml(selectedReview.comment || "Loved the experience.")}"</p>
        <div class="share-row">
          <span class="meta">Share:</span>
          <button aria-label="Share to Facebook" class="share-button facebook" data-action="share-review" data-platform="facebook" data-name="${escapeHtml(
            selectedReview.customer_name
          )}" data-rating="${selectedReview.rating}" data-comment="${escapeHtml(selectedReview.comment || "")}" type="button"><img alt="" src="${facebookIconUrl}" /></button>
          <button aria-label="Share to Instagram" class="share-button instagram" data-action="share-review" data-platform="instagram" data-name="${escapeHtml(
            selectedReview.customer_name
          )}" data-rating="${selectedReview.rating}" data-comment="${escapeHtml(selectedReview.comment || "")}" type="button"><img alt="" src="${instagramIconUrl}" /></button>
          <button aria-label="Share to X" class="share-button x" data-action="share-review" data-platform="x" data-name="${escapeHtml(
            selectedReview.customer_name
          )}" data-rating="${selectedReview.rating}" data-comment="${escapeHtml(selectedReview.comment || "")}" type="button"><img alt="" src="${xIconUrl}" /></button>
          <button aria-label="Share to TikTok" class="share-button tiktok" data-action="share-review" data-platform="tiktok" data-name="${escapeHtml(
            selectedReview.customer_name
          )}" data-rating="${selectedReview.rating}" data-comment="${escapeHtml(selectedReview.comment || "")}" type="button"><img alt="" src="${tiktokIconUrl}" /></button>
        </div>
      </div>
    </div>
  `;
}

function renderReviewModal() {
  if (!state.reviewModalOpen) {
    return "";
  }

  return `
    <div class="modal-backdrop">
      <div class="modal-card" role="dialog" aria-modal="true">
        <h3>Write a Review</h3>
        <form class="form-panel compact-form" data-form="review">
          <div class="form-grid">
            <div class="field">
              <label for="review-name">Your Name</label>
              <input id="review-name" name="customer_name" required />
            </div>
            <div class="field">
              <label for="review-comment">Your Experience</label>
              <textarea id="review-comment" name="comment" required></textarea>
            </div>
            <div class="field">
              <label for="review-rating">Rating</label>
              <select id="review-rating" name="rating" required>
                <option value="5">5 stars</option>
                <option value="4">4 stars</option>
                <option value="3">3 stars</option>
                <option value="2">2 stars</option>
                <option value="1">1 star</option>
              </select>
            </div>
          </div>
          <div class="action-row">
            <button class="ghost-button" data-action="close-review-modal" type="button">Cancel</button>
            <button class="button" type="submit">Submit Review</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderAdminDashboard() {
  const data = state.adminData;

  if (!data) {
    return `
      <section class="page">
        ${renderErrorCard()}
        <div class="empty-state">Admin data is unavailable. Make sure the backend is running and your token is still valid.</div>
      </section>
    `;
  }

  const sections = [
    ["dashboard", "Overview"],
    ["status", "Status"],
    ["menu", "Menu"],
    ["events", "Events"],
    ["photos", "Photos"],
    ["about", "About"],
    ["reviews", "Reviews"]
  ];

  return `
    <section class="page admin-shell">
      ${renderErrorCard()}
      <header class="page-header">
        <span class="eyebrow">Admin portal</span>
        <h1>Manage Purple Polar Bear</h1>
        <p>Top navigation tabs with edits below, following the layout change you asked for in the Expo version.</p>
      </header>

      <div class="admin-tabs">
        ${sections
          .map(
            ([key, label]) => `
              <button class="admin-tab ${state.adminSection === key ? "active" : ""}" data-admin-tab="${key}" type="button">
                ${label}
              </button>
            `
          )
          .join("")}
      </div>

      <div class="admin-layout">
        ${renderAdminSection(data)}
      </div>

      <div class="action-row">
        <button class="ghost-button" data-action="refresh-admin" type="button">Refresh Dashboard</button>
        <a class="ghost-button ghost-link-button" href="#/">Back to Front End</a>
        <button class="ghost-button" data-action="logout-admin" type="button">Log Out</button>
      </div>
    </section>
  `;
}

function renderAdminSection(data) {
  switch (state.adminSection) {
    case "status":
      return `
        <section class="admin-section">
          <div class="admin-panel">
            <h2>Business Status</h2>
            <p>Transparent open/closed message bar content for the homepage.</p>
            <div class="pill">${data.status?.is_open ? "Open" : "Closed"}</div>
            <p>${escapeHtml(data.status?.message || "")}</p>
            <p class="meta">${escapeHtml(data.status?.location || "")}</p>
          </div>
          <form class="form-panel" data-form="admin-status">
            <div class="form-grid">
              <div class="field">
                <label for="status-open">Open status</label>
                <select id="status-open" name="is_open">
                  <option value="true" ${data.status?.is_open ? "selected" : ""}>Open</option>
                  <option value="false" ${!data.status?.is_open ? "selected" : ""}>Closed</option>
                </select>
              </div>
              <div class="field">
                <label for="status-message">Message</label>
                <input id="status-message" name="message" value="${escapeHtml(data.status?.message || "")}" />
              </div>
              <div class="field">
                <label for="status-location">Location</label>
                <input id="status-location" name="location" value="${escapeHtml(data.status?.location || "")}" />
              </div>
            </div>
            <button class="button" type="submit">Save Status</button>
          </form>
        </section>
      `;
    case "menu":
      return `
        <section class="admin-section">
          <form class="form-panel" data-form="admin-menu-add">
            <h2>Add Menu Item</h2>
            <div class="form-grid">
              <div class="field">
                <label for="menu-name">Name</label>
                <input id="menu-name" name="name" required />
              </div>
              <div class="field">
                <label for="menu-emoji">Emoji</label>
                <input id="menu-emoji" name="emoji" value="🍧" required />
              </div>
            </div>
            <button class="button" type="submit">Add Item</button>
          </form>
          <div class="admin-list">
            ${data.menu
              .map(
                (item) => `
                  <article class="admin-card">
                    <strong>${escapeHtml(item.name)}</strong>
                    <p class="meta">Emoji: ${escapeHtml(item.emoji || "🍧")}</p>
                    <div class="action-row">
                      <button class="ghost-button" data-action="delete-menu" data-id="${item.id}" type="button">Delete</button>
                    </div>
                  </article>
                `
              )
              .join("")}
          </div>
        </section>
      `;
    case "events":
      return `
        <section class="admin-section">
          <form class="form-panel" data-form="admin-event-add">
            <h2>Add Event</h2>
            <div class="form-grid">
              <div class="field">
                <label for="event-title">Title</label>
                <input id="event-title" name="title" required />
              </div>
              <div class="field">
                <label for="event-date">Date</label>
                <input id="event-date" name="date" required placeholder="2026-07-04T17:00:00" />
              </div>
              <div class="field">
                <label for="event-location">Location</label>
                <input id="event-location" name="location" required />
              </div>
              <div class="field">
                <label for="event-description">Description</label>
                <textarea id="event-description" name="description"></textarea>
              </div>
            </div>
            <button class="button" type="submit">Add Event</button>
          </form>
          <div class="admin-list">
            ${data.events
              .map(
                (event) => `
                  <article class="admin-card">
                    <strong>${escapeHtml(event.title)}</strong>
                    <p class="meta">${escapeHtml(formatDate(event.date))} · ${escapeHtml(event.location)}</p>
                    <p>${escapeHtml(event.description || "")}</p>
                    <div class="action-row">
                      <button class="ghost-button" data-action="delete-event" data-id="${event.id}" type="button">Delete</button>
                    </div>
                  </article>
                `
              )
              .join("")}
          </div>
          <div class="admin-panel">
            <h3>Incoming Requests</h3>
            <div class="admin-list">
              ${data.requests
                .map(
                  (request) => `
                    <article class="request-card">
                      <strong>${escapeHtml(request.name)}</strong>
                      <p class="meta">${escapeHtml(request.email)} · ${escapeHtml(request.phone)}</p>
                      <p>${escapeHtml(request.event_date)} · ${escapeHtml(request.location)}</p>
                      <p>${escapeHtml(request.message || "")}</p>
                      <div class="action-row">
                        <button class="ghost-button" data-action="update-request" data-id="${request.id}" data-status="approved" type="button">Mark Approved</button>
                        <button class="ghost-button" data-action="update-request" data-id="${request.id}" data-status="pending" type="button">Mark Pending</button>
                      </div>
                    </article>
                  `
                )
                .join("") || `<div class="empty-state">No event requests yet.</div>`}
            </div>
          </div>
        </section>
      `;
    case "photos":
      return `
        <section class="admin-section">
          <form class="form-panel" data-form="admin-photo-add">
            <h2>Upload Photo</h2>
            <div class="form-grid">
              <div class="field">
                <label for="photo-title">Title</label>
                <input id="photo-title" name="title" required />
              </div>
              <div class="field">
                <label for="photo-event">Event Name</label>
                <input id="photo-event" name="event_name" required />
              </div>
              <div class="field">
                <label for="photo-file">Image</label>
                <input id="photo-file" name="image" type="file" accept="image/*" required />
              </div>
            </div>
            <button class="button" type="submit">Upload Photo</button>
          </form>
          <div class="photos-grid">
            ${data.photos
              .map(
                (photo) => `
                  <article class="photo-card">
                    <div class="photo-visual">
                      ${
                        photo.image_base64
                          ? `<img alt="${escapeHtml(photo.title)}" src="${getPhotoSrc(photo.image_base64)}" />`
                          : `<span>📸</span>`
                      }
                    </div>
                    <div class="photo-copy">
                      <strong>${escapeHtml(photo.title)}</strong>
                      <p class="meta">${escapeHtml(photo.event_name)}</p>
                      <div class="action-row">
                        <button class="ghost-button" data-action="delete-photo" data-id="${photo.id}" type="button">Delete</button>
                      </div>
                    </div>
                  </article>
                `
              )
              .join("")}
          </div>
        </section>
      `;
    case "about":
      return `
        <section class="admin-section">
          <form class="form-panel" data-form="admin-about">
            <h2>About Us</h2>
            <div class="field">
              <label for="about-content">Homepage copy</label>
              <textarea id="about-content" name="content">${escapeHtml(data.about?.content || "")}</textarea>
            </div>
            <button class="button" type="submit">Save About Section</button>
          </form>
        </section>
      `;
    case "reviews":
      return `
        <section class="admin-section">
          <div class="admin-list">
            ${data.reviews
              .map(
                (review) => `
                  <article class="admin-card">
                    <div class="stars">${stars(review.rating)}</div>
                    <strong>${escapeHtml(review.customer_name)}</strong>
                    <p>${escapeHtml(review.comment || "")}</p>
                    <p class="meta">Approved: ${review.approved ? "Yes" : "No"}</p>
                    <div class="action-row">
                      <button class="ghost-button" data-action="approve-review" data-id="${review.id}" data-approved="${
                        review.approved ? "false" : "true"
                      }" type="button">
                        ${review.approved ? "Unapprove" : "Approve"}
                      </button>
                      <button class="ghost-button" data-action="delete-review" data-id="${review.id}" type="button">Delete</button>
                    </div>
                  </article>
                `
              )
              .join("")}
          </div>
        </section>
      `;
    default:
      return `
        <section class="admin-section">
          <div class="stats-grid">
            <article class="dashboard-stat">
              <strong>${data.menu.length}</strong>
              <p>Menu Items</p>
            </article>
            <article class="dashboard-stat">
              <strong>${data.events.length}</strong>
              <p>Events</p>
            </article>
            <article class="dashboard-stat">
              <strong>${data.photos.length}</strong>
              <p>Photos</p>
            </article>
            <article class="dashboard-stat">
              <strong>${data.reviews.length}</strong>
              <p>Reviews</p>
            </article>
          </div>
          <div class="admin-panel">
            <h2>Current Status</h2>
            <div class="pill">${data.status?.is_open ? "Open" : "Closed"}</div>
            <p>${escapeHtml(data.status?.message || "No business status message set.")}</p>
            <p class="meta">${escapeHtml(data.status?.location || "")}</p>
          </div>
        </section>
      `;
  }
}

async function handleSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  const kind = form.dataset.form;
  if (!kind) {
    return;
  }

  event.preventDefault();
  state.error = "";

  try {
    if (kind === "event-request") {
      const payload = Object.fromEntries(new FormData(form).entries());
      await apiSend("/api/event-requests", "POST", payload);
      form.reset();
      window.alert("Event request submitted successfully.");
    } else if (kind === "review") {
      const payload = Object.fromEntries(new FormData(form).entries());
      payload.rating = Number(payload.rating);
      await apiSend("/api/reviews", "POST", payload);
      form.reset();
      state.reviewModalOpen = false;
      window.alert("Review submitted. It will appear after admin approval.");
    } else if (kind === "admin-login") {
      const payload = Object.fromEntries(new FormData(form).entries());
      const data = await login(payload.username, payload.password);
      localStorage.setItem("ppb-admin-token", data.token);
      window.location.hash = "/admin/dashboard";
      return;
    } else {
      await handleAdminForm(kind, form);
    }
  } catch (error) {
    state.error = error.message;
  }

  render();
}

async function handleAdminForm(kind, form) {
  const token = getAdminToken();
  const payload = Object.fromEntries(new FormData(form).entries());

  switch (kind) {
    case "admin-status":
      payload.is_open = payload.is_open === "true";
      await apiSend("/api/admin/business-status", "PUT", payload, token);
      break;
    case "admin-menu-add":
      await apiSend("/api/admin/menu", "POST", payload, token);
      form.reset();
      break;
    case "admin-event-add":
      await apiSend("/api/admin/upcoming-events", "POST", payload, token);
      form.reset();
      break;
    case "admin-about":
      await apiSend("/api/admin/about-us", "PUT", payload, token);
      break;
    case "admin-photo-add": {
      const fileInput = form.querySelector('input[type="file"]');
      const file = fileInput?.files?.[0];
      if (!file) {
        throw new Error("Please choose an image to upload.");
      }
      payload.image_base64 = await toBase64(file);
      delete payload.image;
      await apiSend("/api/admin/event-photos", "POST", payload, token);
      form.reset();
      break;
    }
    default:
      break;
  }

  state.adminData = await loadAdminData(token);
}

async function handleClick(event) {
  if (event.target instanceof HTMLElement && event.target.classList.contains("modal-backdrop")) {
    if (state.selectedPhotoId) {
      state.selectedPhotoId = "";
    } else if (state.selectedReviewId) {
      state.selectedReviewId = "";
    } else if (state.reviewModalOpen) {
      state.reviewModalOpen = false;
    } else {
      return;
    }

    render();
    return;
  }

  const button = event.target.closest("[data-action], [data-admin-tab]");
  if (!(button instanceof HTMLElement)) {
    return;
  }

  if (button.dataset.adminTab) {
    state.adminSection = button.dataset.adminTab;
    render();
    return;
  }

  const action = button.dataset.action;
  const id = button.dataset.id;
  const token = getAdminToken();

  try {
    if (action === "open-photo" && id) {
      state.selectedPhotoId = id;
    } else if (action === "close-photo") {
      state.selectedPhotoId = "";
    } else if (action === "open-review" && id) {
      state.selectedReviewId = id;
    } else if (action === "close-review-detail") {
      state.selectedReviewId = "";
    } else if (action === "open-review-modal") {
      state.reviewModalOpen = true;
    } else if (action === "close-review-modal") {
      state.reviewModalOpen = false;
    } else if (action === "share-review") {
      await shareReview(button.dataset);
      return;
    } else if (action === "refresh-admin") {
      state.adminData = await loadAdminData(token);
    } else if (action === "logout-admin") {
      localStorage.removeItem("ppb-admin-token");
      window.location.hash = "/admin";
      return;
    } else if (action === "delete-menu" && id) {
      await apiSend(`/api/admin/menu/${id}`, "DELETE", null, token);
      state.adminData = await loadAdminData(token);
    } else if (action === "delete-event" && id) {
      await apiSend(`/api/admin/upcoming-events/${id}`, "DELETE", null, token);
      state.adminData = await loadAdminData(token);
    } else if (action === "delete-photo" && id) {
      await apiSend(`/api/admin/event-photos/${id}`, "DELETE", null, token);
      state.adminData = await loadAdminData(token);
    } else if (action === "delete-review" && id) {
      await apiSend(`/api/admin/reviews/${id}`, "DELETE", null, token);
      state.adminData = await loadAdminData(token);
    } else if (action === "approve-review" && id) {
      await apiSend(
        `/api/admin/reviews/${id}/approve`,
        "PUT",
        { approved: button.dataset.approved === "true" },
        token
      );
      state.adminData = await loadAdminData(token);
    } else if (action === "update-request" && id) {
      await apiSend(
        `/api/admin/event-requests/${id}/status`,
        "PUT",
        { status: button.dataset.status || "pending" },
        token
      );
      state.adminData = await loadAdminData(token);
    }
  } catch (error) {
    state.error = error.message;
  }

  render();
}

async function shareReview(dataset) {
  const rating = Number(dataset.rating) || 5;
  const comment = dataset.comment || "";
  const name = dataset.name || "A happy customer";
  const shareText = `${"⭐".repeat(rating)} "${comment}" - ${name} loved Purple Polar Bear Hawaiian Shave Ice!`;
  const targetUrl = window.location.origin + window.location.pathname;

  if (dataset.platform === "facebook") {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(targetUrl)}&quote=${encodeURIComponent(shareText)}`,
      "_blank",
      "width=600,height=500"
    );
    return;
  }

  if (dataset.platform === "x") {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(targetUrl)}`,
      "_blank",
      "width=600,height=500"
    );
    return;
  }

  try {
    await navigator.clipboard.writeText(shareText);
    window.alert(
      dataset.platform === "instagram"
        ? "Review copied to clipboard. Open Instagram to share it."
        : "Review copied to clipboard. Open TikTok to share it."
    );
  } catch {
    window.alert(shareText);
  }
}

function flavorDescription(name) {
  const map = {
    "Classic Cherry": "Sweet, bright, and a crowd favorite.",
    "Blue Raspberry": "Tangy blue fun with big summer energy.",
    Grape: "Purple and playful, just like the brand.",
    Orange: "Citrus-forward and super refreshing.",
    "Polar Bear Special": "The signature blend built for return visits.",
    "Purple Rain": "A dramatic purple pour with a fun twist.",
    "Rainbow Blast": "Colorful, layered, and made for party photos."
  };

  return map[name] || "Fresh shaved ice with a fun flavor profile.";
}

function createSnowflakes() {
  const shell = document.querySelector(".snowflakes");
  let snowLevel = 0;

  for (let index = 0; index < 85; index += 1) {
    const flake = document.createElement("span");
    flake.className = "snowflake";
    flake.textContent = "\u2744";
    flake.style.left = `${Math.random() * 100}%`;
    flake.style.animationDuration = `${4.5 + Math.random() * 5.5}s`;
    flake.style.animationDelay = `${Math.random() * 3}s`;
    flake.style.fontSize = `${10 + Math.random() * 12}px`;
    flake.style.setProperty("--drift", `${Math.round((Math.random() - 0.5) * 190)}px`);
    flake.style.opacity = String(0.45 + Math.random() * 0.4);
    shell.append(flake);
  }

  window.setInterval(() => {
    snowLevel = Math.min(640, snowLevel + 2.8);
    if (snowbank) {
      snowbank.style.setProperty("--snow-height", `${snowLevel}px`);
      document.body.style.paddingBottom = `${Math.max(320, 170 + snowLevel)}px`;
      for (let count = 0; count < 6; count += 1) {
        const settled = document.createElement("span");
        settled.className = "settled-flake";
        settled.textContent = "\u2744";
        settled.style.left = `${Math.random() * 100}%`;
        settled.style.bottom = `${Math.random() * Math.max(18, snowLevel - 8)}px`;
        settled.style.fontSize = `${8 + Math.random() * 10}px`;
        settled.style.opacity = String(0.5 + Math.random() * 0.35);
        snowbank.append(settled);
      }

      const settledFlakes = snowbank.querySelectorAll(".settled-flake");
      while (settledFlakes.length > 2600) {
        settledFlakes[0].remove();
      }
    }
  }, 450);
}


