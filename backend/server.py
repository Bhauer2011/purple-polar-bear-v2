from __future__ import annotations

import json
import os
import re
import smtplib
from datetime import datetime
from email.message import EmailMessage
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
DATA_FILE = ROOT_DIR / "data.json"

app = FastAPI(title="Purple Polar Bear API")
api = FastAPI()
security = HTTPBearer()

ADMIN_ACCOUNTS = {
    "Administrator": "P@ssW0rd!",
    "ppbadmin": "snowball123",
}
ADMIN_TOKENS = {
    username: f"admin_token_{username.lower()}" for username in ADMIN_ACCOUNTS
}
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
SMTP_HOST = os.getenv("PPB_SMTP_HOST", "").strip()
SMTP_PORT = int(os.getenv("PPB_SMTP_PORT", "587") or "587")
SMTP_USERNAME = os.getenv("PPB_SMTP_USERNAME", "").strip()
SMTP_PASSWORD = os.getenv("PPB_SMTP_PASSWORD", "").strip()
SMTP_FROM = os.getenv("PPB_SMTP_FROM", "").strip()
SMTP_USE_TLS = os.getenv("PPB_SMTP_USE_TLS", "true").strip().lower() not in {"0", "false", "no", "off"}


class BusinessStatus(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    is_open: bool
    message: str = ""
    location: str = ""
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class BusinessStatusUpdate(BaseModel):
    is_open: bool
    message: Optional[str] = ""
    location: Optional[str] = ""


class MenuItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    emoji: str = "🍧"
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class MenuItemCreate(BaseModel):
    name: str
    emoji: str = "🍧"


class EventRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    email: str
    phone: str
    event_date: str
    location: str
    message: str = ""
    status: str = "pending"
    notification_sent: bool = False
    notification_message: str = ""
    notification_recipient_count: int = 0
    notification_sent_at: str = ""
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class EventRequestCreate(BaseModel):
    name: str
    email: str
    phone: str
    event_date: str
    location: str
    message: Optional[str] = ""


class UpcomingEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    title: str
    date: str
    location: str
    description: str = ""
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class UpcomingEventCreate(BaseModel):
    title: str
    date: str
    location: str
    description: Optional[str] = ""


class AboutUs(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    content: str
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class AboutUsUpdate(BaseModel):
    content: str


class EventPhoto(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    title: str = ""
    event_name: str = ""
    image_base64: str
    featured: bool = False
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class EventPhotoCreate(BaseModel):
    title: Optional[str] = ""
    event_name: Optional[str] = ""
    image_base64: str


class EventPhotoFeatureUpdate(BaseModel):
    featured: bool


class Review(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    customer_name: str
    rating: int
    comment: str = ""
    approved: bool = False
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class ReviewCreate(BaseModel):
    customer_name: str
    rating: int
    comment: Optional[str] = ""


class ReviewUpdate(BaseModel):
    approved: bool


class AdminLogin(BaseModel):
    username: str
    password: str


class NotificationEmail(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    email: str
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class NotificationEmailCreate(BaseModel):
    email: str


def verify_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> bool:
    if credentials.credentials not in ADMIN_TOKENS.values():
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return True


def now_iso() -> str:
    return datetime.utcnow().isoformat()


def is_valid_email_address(value: str) -> bool:
    return bool(EMAIL_RE.match(value.strip()))


def get_notification_recipients(data: dict) -> list[str]:
    return [
        entry.get("email", "").strip()
        for entry in data.get("notification_emails", [])
        if entry.get("email", "").strip()
    ]


def send_event_request_notification(request_record: dict, recipients: list[str]) -> tuple[bool, str]:
    if not recipients:
        return False, "No notification recipients configured."

    if not SMTP_HOST or not SMTP_FROM:
        return False, "SMTP email delivery is not configured."

    message = EmailMessage()
    message["Subject"] = f"New Purple Polar Bear Event Request - {request_record.get('name', 'New Request')}"
    message["From"] = SMTP_FROM
    message["To"] = ", ".join(recipients)
    message.set_content(
        "\n".join(
            [
                "New Purple Polar Bear event request",
                "",
                f"Name: {request_record.get('name', '')}",
                f"Email: {request_record.get('email', '')}",
                f"Phone: {request_record.get('phone', '')}",
                f"Event Date: {request_record.get('event_date', '')}",
                f"Location: {request_record.get('location', '')}",
                f"Status: {request_record.get('status', 'pending')}",
                "",
                "Details:",
                request_record.get("message", "") or "",
            ]
        )
    )

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            server.ehlo()
            if SMTP_USE_TLS:
                server.starttls()
                server.ehlo()
            if SMTP_USERNAME:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(message)
        return True, f"Sent to {len(recipients)} recipient(s)."
    except Exception as exc:
        return False, f"Email notification failed: {exc}"


def build_sample_events() -> list[dict]:
    return [
        UpcomingEvent(
            title="Spring Market Pop-Up",
            date="2025-04-12T11:00:00",
            location="Riverside Artisan Market",
            description="An early-season stop with bright flavors and family foot traffic all afternoon.",
        ).model_dump(),
        UpcomingEvent(
            title="Summer Street Fair",
            date="2025-07-20T14:00:00",
            location="Downtown Market Square",
            description="A fun afternoon serving neighborhood favorites during the summer fair.",
        ).model_dump(),
        UpcomingEvent(
            title="School Fundraiser Night",
            date="2025-09-13T18:30:00",
            location="Riverside Elementary",
            description="We set up at the school fundraiser with classic flavors and Rainbow Blast.",
        ).model_dump(),
        UpcomingEvent(
            title="Holiday Tree Lighting",
            date="2025-12-05T17:45:00",
            location="City Hall Plaza",
            description="A festive evening event with lights, music, and cold treats for the crowd.",
        ).model_dump(),
        UpcomingEvent(
            title="Little League Opening Day",
            date="2026-04-06T12:30:00",
            location="Northside Ball Fields",
            description="Purple Polar Bear favorites served by the concession area through the afternoon games.",
        ).model_dump(),
        UpcomingEvent(
            title="Spring Carnival Weekend",
            date="2026-05-02T15:00:00",
            location="Pine Grove Community Center",
            description="An afternoon stop with family flavors, music, and a steady event crowd.",
        ).model_dump(),
        UpcomingEvent(
            title="Community Splash Day",
            date="2026-06-21T13:00:00",
            location="Lakeside Family Park",
            description="A warm-weather park event with music, water games, and our signature snow ball specials.",
        ).model_dump(),
        UpcomingEvent(
            title="Fourth of July Block Party",
            date="2026-07-04T17:00:00",
            location="Heritage Avenue",
            description="A neighborhood evening event with cold treats, music, and fireworks traffic.",
        ).model_dump(),
        UpcomingEvent(
            title="Back to School Pep Rally",
            date="2026-08-22T16:30:00",
            location="Central High School",
            description="A late-summer school event featuring fan favorites and a big after-school crowd.",
        ).model_dump(),
    ]


def build_sample_photo(title: str, event_name: str, image_path: str, *, featured: bool = False) -> dict:
    return EventPhoto(title=title, event_name=event_name, image_base64=image_path, featured=featured).model_dump()


def build_sample_photos() -> list[dict]:
    return [
        build_sample_photo("Baby SnowBall #1", "Baby Event", "/assets/gallery/user-photos/baby-snowball-1.png", featured=True),
        build_sample_photo("Baby SnowBall #2", "Baby Event", "/assets/gallery/user-photos/baby-snowball-2.png", featured=True),
        build_sample_photo("Baby SnowBall #3", "Baby Event", "/assets/gallery/user-photos/baby-snowball-3.png"),
        build_sample_photo("Baby SnowBall #4", "Baby Event", "/assets/gallery/user-photos/baby-snowball-4.png"),
        build_sample_photo("Baby SnowBall #5", "Baby Event", "/assets/gallery/user-photos/baby-snowball-5.png"),
        build_sample_photo("Baby SnowBall #6", "Baby Event", "/assets/gallery/user-photos/baby-snowball-6.png"),
    ]


def build_sample_reviews() -> list[dict]:
    return [
        Review(
            customer_name="Emily R.",
            rating=4,
            comment="Love the variety of flavors. The Rainbow Blast is incredible!",
            approved=True,
        ).model_dump(),
        Review(
            customer_name="Mike J.",
            rating=5,
            comment="Great service and delicious treats. Perfect for our summer party!",
            approved=True,
        ).model_dump(),
        Review(
            customer_name="Sarah M.",
            rating=5,
            comment="Amazing snow balls! The kids absolutely loved the Purple Rain flavor. Will definitely be back!",
            approved=True,
        ).model_dump(),
        Review(
            customer_name="Jordan T.",
            rating=5,
            comment="Best shave ice in town.",
            approved=True,
        ).model_dump(),
        Review(
            customer_name="Alicia P.",
            rating=4,
            comment="The setup looked great, service was fast, and the flavors were a hit with both kids and adults at our neighborhood event.",
            approved=True,
        ).model_dump(),
        Review(
            customer_name="Marcus L.",
            rating=5,
            comment="We booked Purple Polar Bear for a school fundraiser and everything went smoothly from start to finish. The team arrived on time, the stand looked fantastic, and the line stayed busy all evening because everyone kept coming back for another flavor.",
            approved=True,
        ).model_dump(),
        Review(
            customer_name="Kayla N.",
            rating=5,
            comment="Such a fun treat stand.",
            approved=True,
        ).model_dump(),
        Review(
            customer_name="Chris B.",
            rating=4,
            comment="Fast line and great flavor.",
            approved=True,
        ).model_dump(),
        Review(
            customer_name="Tina W.",
            rating=5,
            comment="The purple flavors were a hit.",
            approved=True,
        ).model_dump(),
        Review(
            customer_name="Devon S.",
            rating=5,
            comment="We booked Purple Polar Bear for our neighborhood splash day and the setup looked polished, moved quickly, and kept the kids excited the whole time.",
            approved=True,
        ).model_dump(),
        Review(
            customer_name="Rachel C.",
            rating=4,
            comment="The stand looked great in photos, the team was easy to work with, and the flavor options gave everyone something different to try during our school event.",
            approved=True,
        ).model_dump(),
        Review(
            customer_name="Brandon H.",
            rating=5,
            comment="Purple Polar Bear ended up being one of the most talked-about parts of our company summer celebration. The trailer looked sharp, the service stayed friendly even when the line got long, and the guests kept mentioning how good the flavors were long after the event wrapped up.",
            approved=True,
        ).model_dump(),
    ]


def default_data() -> dict:
    return {
        "business_status": BusinessStatus(
            is_open=True,
            message="Open for delicious snow balls! Come get your Purple Polar Bear special!",
            location="Downtown Snow Ball Stand, Main Street",
        ).model_dump(),
        "menu_items": [
            MenuItem(name="Classic Cherry", emoji="🍧").model_dump(),
            MenuItem(name="Blue Raspberry", emoji="🍧").model_dump(),
            MenuItem(name="Grape", emoji="🍧").model_dump(),
            MenuItem(name="Orange", emoji="🍧").model_dump(),
            MenuItem(name="Polar Bear Special", emoji="🍧").model_dump(),
            MenuItem(name="Purple Rain", emoji="🍧").model_dump(),
            MenuItem(name="Rainbow Blast", emoji="🍧").model_dump(),
        ],
        "event_requests": [],
        "notification_emails": [
            NotificationEmail(email="bhauer2011@gmail.com").model_dump(),
        ],
        "upcoming_events": build_sample_events(),
        "about_us": AboutUs(
            content=(
                "Purple Polar Bear is the premier snow ball destination! We've been serving the "
                "community for over 10 years with the finest shaved ice and premium syrups. Our "
                "family-owned business takes pride in bringing joy and refreshing treats to your "
                "neighborhood events and daily cravings. Come experience the Purple Polar Bear difference!"
            )
        ).model_dump(),
        "event_photos": build_sample_photos(),
        "reviews": build_sample_reviews(),
    }


def load_data() -> dict:
    if not DATA_FILE.exists():
        data = default_data()
        save_data(data)
        return data
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    changed = False
    if "notification_emails" not in data:
        data["notification_emails"] = default_data()["notification_emails"]
        changed = True
    for index, photo in enumerate(data.get("event_photos", [])):
      if "featured" not in photo:
          photo["featured"] = index < 2
          changed = True
    if changed:
        save_data(data)
    return data


def save_data(data: dict) -> None:
    DATA_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def sort_by_created(items: list[dict], reverse: bool = True) -> list[dict]:
    return sorted(items, key=lambda item: item.get("created_at", ""), reverse=reverse)


@app.get("/api")
def root() -> dict:
    return {"message": "Purple Polar Bear Snow Ball API"}


@app.get("/api/business-status")
def get_business_status() -> dict:
    return load_data()["business_status"]


@app.get("/api/menu")
def get_menu() -> list[dict]:
    return sort_by_created(load_data()["menu_items"], reverse=False)


@app.get("/api/upcoming-events")
def get_upcoming_events() -> list[dict]:
    data = load_data()
    return sorted(data["upcoming_events"], key=lambda item: item.get("date", ""))


@app.get("/api/about-us")
def get_about_us() -> dict:
    return load_data()["about_us"]


@app.get("/api/event-photos")
def get_event_photos() -> list[dict]:
    return sort_by_created(load_data()["event_photos"])


@app.get("/api/reviews")
def get_reviews() -> list[dict]:
    data = load_data()
    approved = [review for review in data["reviews"] if review.get("approved")]
    return sort_by_created(approved)


@app.post("/api/event-requests")
def create_event_request(request: EventRequestCreate) -> dict:
    data = load_data()
    record = EventRequest(**request.model_dump()).model_dump()
    record["notification_recipient_count"] = 0
    record["notification_sent"] = False
    record["notification_message"] = ""
    record["notification_sent_at"] = ""
    data["event_requests"].append(record)
    save_data(data)
    return {
        "message": "Event request submitted successfully",
        "id": record["id"],
    }


@app.post("/api/reviews")
def create_review(review: ReviewCreate) -> dict:
    data = load_data()
    record = Review(**review.model_dump()).model_dump()
    data["reviews"].append(record)
    save_data(data)
    return {"message": "Review submitted successfully", "id": record["id"]}


@app.post("/api/admin/login")
def admin_login(login: AdminLogin) -> dict:
    if ADMIN_ACCOUNTS.get(login.username) == login.password:
        return {
            "token": ADMIN_TOKENS[login.username],
            "message": "Login successful",
        }
    raise HTTPException(status_code=401, detail="Invalid credentials")


@app.put("/api/admin/business-status", dependencies=[Depends(verify_admin)])
def update_business_status(update: BusinessStatusUpdate) -> dict:
    data = load_data()
    data["business_status"] = BusinessStatus(**update.model_dump()).model_dump()
    save_data(data)
    return {"message": "Status updated successfully"}


@app.post("/api/admin/menu", dependencies=[Depends(verify_admin)])
def create_menu_item(item: MenuItemCreate) -> dict:
    data = load_data()
    record = MenuItem(**item.model_dump()).model_dump()
    data["menu_items"].append(record)
    save_data(data)
    return {"message": "Menu item created successfully", "id": record["id"]}


@app.delete("/api/admin/menu/{item_id}", dependencies=[Depends(verify_admin)])
def delete_menu_item(item_id: str) -> dict:
    data = load_data()
    before = len(data["menu_items"])
    data["menu_items"] = [item for item in data["menu_items"] if item["id"] != item_id]
    if len(data["menu_items"]) == before:
        raise HTTPException(status_code=404, detail="Menu item not found")
    save_data(data)
    return {"message": "Menu item deleted successfully"}


@app.post("/api/admin/upcoming-events", dependencies=[Depends(verify_admin)])
def create_upcoming_event(event: UpcomingEventCreate) -> dict:
    data = load_data()
    record = UpcomingEvent(**event.model_dump()).model_dump()
    data["upcoming_events"].append(record)
    save_data(data)
    return {"message": "Event created successfully", "id": record["id"]}


@app.delete("/api/admin/upcoming-events/{event_id}", dependencies=[Depends(verify_admin)])
def delete_upcoming_event(event_id: str) -> dict:
    data = load_data()
    before = len(data["upcoming_events"])
    data["upcoming_events"] = [item for item in data["upcoming_events"] if item["id"] != event_id]
    if len(data["upcoming_events"]) == before:
        raise HTTPException(status_code=404, detail="Event not found")
    save_data(data)
    return {"message": "Event deleted successfully"}


@app.get("/api/admin/event-requests", dependencies=[Depends(verify_admin)])
def get_event_requests() -> list[dict]:
    return sort_by_created(load_data()["event_requests"])


@app.get("/api/admin/notification-emails", dependencies=[Depends(verify_admin)])
def get_notification_emails() -> list[dict]:
    return sort_by_created(load_data().get("notification_emails", []), reverse=False)


@app.post("/api/admin/notification-emails", dependencies=[Depends(verify_admin)])
def create_notification_email(payload: NotificationEmailCreate) -> dict:
    email = payload.email.strip()
    if not is_valid_email_address(email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    data = load_data()
    existing = data.setdefault("notification_emails", [])
    if any(item.get("email", "").strip().lower() == email.lower() for item in existing):
        raise HTTPException(status_code=400, detail="That notification email already exists.")

    record = NotificationEmail(email=email).model_dump()
    existing.append(record)
    save_data(data)
    return {"message": "Notification email added successfully", "id": record["id"]}


@app.delete("/api/admin/notification-emails/{recipient_id}", dependencies=[Depends(verify_admin)])
def delete_notification_email(recipient_id: str) -> dict:
    data = load_data()
    before = len(data.get("notification_emails", []))
    data["notification_emails"] = [
        item for item in data.get("notification_emails", []) if item.get("id") != recipient_id
    ]
    if len(data["notification_emails"]) == before:
        raise HTTPException(status_code=404, detail="Notification email not found")
    save_data(data)
    return {"message": "Notification email removed successfully"}


@app.put("/api/admin/event-requests/{request_id}/status", dependencies=[Depends(verify_admin)])
def update_event_request_status(request_id: str, status: dict) -> dict:
    data = load_data()
    for request in data["event_requests"]:
        if request["id"] == request_id:
            request["status"] = status.get("status", "pending")
            save_data(data)
            return {"message": "Status updated successfully"}
    raise HTTPException(status_code=404, detail="Event request not found")


@app.put("/api/admin/about-us", dependencies=[Depends(verify_admin)])
def update_about_us(update: AboutUsUpdate) -> dict:
    data = load_data()
    data["about_us"] = AboutUs(content=update.content).model_dump()
    save_data(data)
    return {"message": "About Us updated successfully"}


@app.post("/api/admin/event-photos", dependencies=[Depends(verify_admin)])
def create_event_photo(photo: EventPhotoCreate) -> dict:
    data = load_data()
    payload = photo.model_dump()
    payload["title"] = (payload.get("title") or "").strip() or f"Photo {len(data['event_photos']) + 1}"
    payload["event_name"] = (payload.get("event_name") or "").strip()
    record = EventPhoto(**payload).model_dump()
    data["event_photos"].append(record)
    save_data(data)
    return {"message": "Photo uploaded successfully", "id": record["id"]}


@app.put("/api/admin/event-photos/{photo_id}/featured", dependencies=[Depends(verify_admin)])
def update_event_photo_featured(photo_id: str, payload: EventPhotoFeatureUpdate) -> dict:
    data = load_data()
    target = None
    for photo in data["event_photos"]:
        if photo["id"] == photo_id:
            target = photo
            break
    if target is None:
        raise HTTPException(status_code=404, detail="Photo not found")

    target["featured"] = payload.featured
    if payload.featured:
        featured = [photo for photo in data["event_photos"] if photo.get("featured")]
        for extra in featured[2:]:
            extra["featured"] = False

    save_data(data)
    return {"message": "Photo featured status updated successfully"}


@app.delete("/api/admin/event-photos/{photo_id}", dependencies=[Depends(verify_admin)])
def delete_event_photo(photo_id: str) -> dict:
    data = load_data()
    before = len(data["event_photos"])
    data["event_photos"] = [item for item in data["event_photos"] if item["id"] != photo_id]
    if len(data["event_photos"]) == before:
        raise HTTPException(status_code=404, detail="Photo not found")
    save_data(data)
    return {"message": "Photo deleted successfully"}


@app.get("/api/admin/reviews", dependencies=[Depends(verify_admin)])
def get_all_reviews() -> list[dict]:
    return sort_by_created(load_data()["reviews"])


@app.put("/api/admin/reviews/{review_id}/approve", dependencies=[Depends(verify_admin)])
def approve_review(review_id: str, approval: ReviewUpdate) -> dict:
    data = load_data()
    for review in data["reviews"]:
        if review["id"] == review_id:
            review["approved"] = approval.approved
            save_data(data)
            return {"message": "Review approval status updated successfully"}
    raise HTTPException(status_code=404, detail="Review not found")


@app.delete("/api/admin/reviews/{review_id}", dependencies=[Depends(verify_admin)])
def delete_review(review_id: str) -> dict:
    data = load_data()
    before = len(data["reviews"])
    data["reviews"] = [item for item in data["reviews"] if item["id"] != review_id]
    if len(data["reviews"]) == before:
        raise HTTPException(status_code=404, detail="Review not found")
    save_data(data)
    return {"message": "Review deleted successfully"}


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
