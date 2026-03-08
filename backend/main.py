from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from groq import Groq
import os
import time
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="CiveGPT API", version="3.1.0", description="General-purpose AI assistant with UDOM expertise")

origins = [
    "https://civegpt.netlify.app",
    "http://localhost:3000",
    "http://localhost:3001",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

UDOM_CAMPUSES = {
    "main": {
        "name": "Main Campus",
        "location": {"lat": -6.165917, "lng": 35.743553},
        "address": "P.O. Box 338, Dodoma, Tanzania",
        "departments": ["Engineering", "Science", "Education", "Business", "Humanities"],
        "facilities": ["Library", "Admin Block", "Lecture Halls", "Hostels", "Cafeteria", "Sports Complex"]
    },
    "health": {
        "name": "Health Sciences Campus",
        "location": {"lat": -6.160083, "lng": 35.749667},
        "address": "Mlimwa, Dodoma",
        "departments": ["Medicine", "Nursing", "Pharmacy", "Dentistry", "Public Health"],
        "facilities": ["Medical Library", "Labs", "Teaching Hospital", "Research Center", "Clinical Skills Lab"]
    },
    "engineering": {
        "name": "Engineering Campus",
        "location": {"lat": -6.170250, "lng": 35.740833},
        "address": "Nkuhungu, Dodoma",
        "departments": ["Civil Engineering", "Electrical", "Mechanical", "Mining", "Computer Engineering"],
        "facilities": ["Workshops", "Engineering Labs", "Design Studios", "Innovation Hub", "Computer Labs"]
    }
}

EMERGENCY_CONTACTS = {
    "en": {
        "campus_security": "0755123456",
        "medical_emergency": "112",
        "fire_emergency": "114",
        "student_affairs": "0755123457",
        "academic_office": "0755123458"
    },
    "sw": {
        "campus_security": "0755123456",
        "dharura_ya_kiafya": "112",
        "dharura_ya_moto": "114",
        "masuala_ya_wanafunzi": "0755123457",
        "ofisi_ya_masomo": "0755123458"
    }
}

class ChatRequest(BaseModel):
    message: str
    language: str = "English"
    history: Optional[List[Dict]] = None
    context: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    response_time: float
    model: str
    suggestions: Optional[List[str]] = None
    resources: Optional[List[Dict]] = None

class CampusInfoRequest(BaseModel):
    campus_id: str
    language: str = "English"

def is_udom_query(message: str) -> bool:
    udom_keywords = [
        "udom", "campus", "lecture", "professor", "hostel", "library",
        "dodoma university", "faculty of", "department of", "student affairs",
        "registration", "timetable", "exam", "course", "academic calendar",
        "cive", "college of informatics", "virtual education"
    ]
    return any(kw in message.lower() for kw in udom_keywords)

def detect_emergency(message: str, language: str) -> bool:
    emergency_keywords_en = ["emergency", "help", "urgent", "security", "danger", "accident", "fire", "medical"]
    emergency_keywords_sw = ["dharura", "msaada", "haraka", "usalama", "hatari", "ajali", "moto", "afya"]
    keywords = emergency_keywords_sw if language == "Swahili" else emergency_keywords_en
    return any(kw in message.lower() for kw in keywords)

def get_general_system_prompt(language: str) -> str:
    if language == "Swahili":
        return (
            "Wewe ni CiveGPT, msaidizi wa AI wa jumla kutoka Chuo cha Informatics na Elimu Mtandaoni (CIVE) "
            "cha Chuo Kikuu cha Dodoma. Kazi yako ni kumsaidia mtumiaji kwa njia ya moja kwa moja, kama ChatGPT. "
            "Unajibu maswali yoyote kwa ujuzi wako mwenyewe, kutoa maelezo, kutatua matatizo, kuandika, kufanya hesabu, "
            "na kutoa ushauri. Usimpeleke mtumiaji kwenye rasilimali za nje isipokuwa kama anauliza hasa kuhusu UDOM. "
            "Hata kama anauliza kitu kinachohusiana na UDOM, jaribu kujibu moja kwa moja kwanza, na uongeze rasilimali za UDOM "
            "kama nyongeza, si kama jibu kuu.\n\n"
            "Mwongozo:\n"
            "- Jibu maswali ya jumla kwa undani na usahihi.\n"
            "- Usitumie alama za ** au formatting yoyote ya markdown. Tumia maandishi wazi tu.\n"
            "- Ikiwa swali ni kuhusu UDOM, toa taarifa sahihi za UDOM, lakini usimpeleke mtumiaji kwenye ofisi au tovuti "
            "isipokuwa kama ni muhimu sana (k.m., namba za dharura).\n"
            "- Kuwa rafiki na msaada."
        )
    else:
        return (
            "You are CiveGPT, a general-purpose AI assistant from the College of Informatics and Virtual Education (CIVE) "
            "at the University of Dodoma. Your job is to help the user directly, like ChatGPT. You answer any questions using "
            "your own knowledge, provide explanations, solve problems, write, do math, and give advice. Do not redirect the user "
            "to external resources unless they explicitly ask about UDOM. Even for UDOM-related queries, try to answer directly "
            "first, and only add UDOM resources as supplementary information, not as the main answer.\n\n"
            "Guidelines:\n"
            "- Answer general questions thoroughly and accurately.\n"
            "- Do not use ** or any markdown formatting. Use plain text only.\n"
            "- If the question is about UDOM, provide accurate UDOM information, but do not send the user to offices or websites "
            "unless absolutely necessary (e.g., emergency numbers).\n"
            "- Be friendly and helpful."
        )

def get_udom_system_prompt(language: str, is_emergency: bool = False) -> str:
    base_sw = (
        "Wewe ni CiveGPT, msaidizi wa AI wa Chuo cha Informatics na Elimu Mtandaoni (CIVE) cha Chuo Kikuu cha Dodoma. "
        "Una ujuzi maalum kuhusu kampasi za UDOM, rasilimali za masomo, nambari za dharura, na huduma za wanafunzi. "
        "Jibu kwa usahihi na kwa undani kuhusu UDOM. Jaribu kujibu moja kwa moja, usimpeleke mtumiaji kwenye ofisi au tovuti "
        "isipokuwa kama ni lazima kabisa (k.m., kwa masuala ya kusajili au dharura). Tumia maandishi wazi, bila **."
    )
    base_en = (
        "You are CiveGPT, an AI assistant from the College of Informatics and Virtual Education (CIVE) at the University of Dodoma. "
        "You have specialised knowledge about UDOM campuses, academic resources, emergency contacts, and student services. "
        "Answer accurately and in detail about UDOM. Try to answer directly; do not redirect the user to offices or websites "
        "unless absolutely necessary (e.g., for registration issues or emergencies). Use plain text, no **."
    )
    if is_emergency:
        if language == "Swahili":
            base_sw += " Hili ni swali la dharura. Toa nambari za mawasiliano za dharura mara moja na ushauri wa usalama. Tumia maandishi wazi."
        else:
            base_en += " This is an emergency query. Provide emergency contact numbers immediately and safety advice. Use plain text."
    return base_sw if language == "Swahili" else base_en

def get_suggestions(language: str, is_udom: bool = False) -> List[str]:
    if is_udom:
        if language == "Swahili":
            return [
                "Nionyeshe ramani ya kampasi",
                "Nambari za dharura za UDOM",
                "Ratiba ya mitihani",
                "Maktaba iko wapi?"
            ]
        else:
            return [
                "Show me the campus map",
                "UDOM emergency contacts",
                "Exam timetable",
                "Where is the library?"
            ]
    else:
        if language == "Swahili":
            return [
                "Nisaidie kuandika barua pepe",
                "Eleza nguvu ya mvuto",
                "Ninaandikaje CV?",
                "Habari za leo"
            ]
        else:
            return [
                "Help me write an email",
                "Explain gravity",
                "How to write a CV",
                "Today's news"
            ]

def get_resources(language: str) -> List[Dict]:
    if language == "Swahili":
        return [
            {"name": "Tovuti ya UDOM", "url": "https://www.udom.ac.tz", "type": "website"},
            {"name": "Maktaba Mtandaoni", "url": "https://library.udom.ac.tz", "type": "library"},
            {"name": "Tovuti ya Mwanafunzi", "url": "https://portal.udom.ac.tz", "type": "portal"}
        ]
    else:
        return [
            {"name": "UDOM Website", "url": "https://www.udom.ac.tz", "type": "website"},
            {"name": "Online Library", "url": "https://library.udom.ac.tz", "type": "library"},
            {"name": "Student Portal", "url": "https://portal.udom.ac.tz", "type": "portal"}
        ]

def strip_markdown_bold(text: str) -> str:
    return text.replace('**', '')

@app.post("/chat", response_model=ChatResponse)
async def chat_with_civegpt(request: ChatRequest):
    start_time = time.time()
    try:
        if not request.message.strip():
            error_msg = "Tafadhali andika ujumbe." if request.language == "Swahili" else "Please provide a message."
            raise HTTPException(status_code=400, detail=error_msg)

        udom_related = is_udom_query(request.message)
        emergency = detect_emergency(request.message, request.language) if udom_related else False

        logger.info(f"Chat request - Lang: {request.language}, UDOM: {udom_related}, Emergency: {emergency}")

        if udom_related:
            system_prompt = get_udom_system_prompt(request.language, emergency)
            user_prompt = f"UDOM student query: {request.message}" if request.language == "English" else f"Swali la mwanafunzi wa UDOM: {request.message}"
        else:
            system_prompt = get_general_system_prompt(request.language)
            user_prompt = request.message

        chat_completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=500,
            temperature=0.7,
            top_p=0.8,
            stream=False,
            timeout=30
        )

        response_text = chat_completion.choices[0].message.content.strip()

        if udom_related and emergency:
            contacts = EMERGENCY_CONTACTS["sw" if request.language == "Swahili" else "en"]
            emergency_info = "\n\n " + ("Nambari za Dharura:" if request.language == "Swahili" else "Emergency Contacts:") + "\n"
            for service, number in contacts.items():
                emergency_info += f"- {service}: {number}\n"
            response_text += emergency_info

        response_text = strip_markdown_bold(response_text)

        response_time = time.time() - start_time

        suggestions = get_suggestions(request.language, udom_related)
        resources = get_resources(request.language) if udom_related else []

        return ChatResponse(
            response=response_text,
            response_time=round(response_time, 2),
            model="llama-3.3-70b-versatile",
            suggestions=suggestions,
            resources=resources
        )

    except HTTPException:
        raise
    except Exception as e:
        response_time = time.time() - start_time
        logger.error(f"Error processing chat request: {str(e)}")
        error_msg = (
            "Samahani, kuna hitilafu katika mfumo. Tafadhali jaribu tena."
            if request.language == "Swahili"
            else "Sorry, there's a system error. Please try again."
        )
        raise HTTPException(
            status_code=500,
            detail={
                "error": error_msg,
                "response_time": round(response_time, 2)
            }
        )

@app.get("/campuses")
async def get_campuses():
    return {
        "campuses": UDOM_CAMPUSES,
        "total_campuses": len(UDOM_CAMPUSES)
    }

@app.post("/campus/{campus_id}")
async def get_campus_info(campus_id: str, request: CampusInfoRequest):
    if campus_id not in UDOM_CAMPUSES:
        error_msg = "Kampasi haijapatikana." if request.language == "Swahili" else "Campus not found."
        raise HTTPException(status_code=404, detail=error_msg)

    campus = UDOM_CAMPUSES[campus_id]
    if request.language == "Swahili":
        campus["description"] = f"Kampasi kuu ya {campus['name']} ya Chuo Kikuu cha Dodoma."
    else:
        campus["description"] = f"Main {campus['name']} of University of Dodoma."

    return campus

@app.get("/emergency-contacts")
async def get_emergency_contacts(language: str = "English"):
    contacts = EMERGENCY_CONTACTS["sw" if language == "Swahili" else "en"]
    return {
        "language": language,
        "contacts": contacts,
        "note": "Call these numbers for immediate assistance" if language == "English" else "Piga namba hizi kwa usaidizi wa haraka"
    }

@app.get("/academic-resources")
async def get_academic_resources(language: str = "English"):
    resources_en = {
        "timetable": "https://ratiba.udom.ac.tz",
        "library": "https://library.udom.ac.tz",
        "student_portal": "https://portal.udom.ac.tz",
        "online_learning": "https://elearning.udom.ac.tz",
        "academic_calendar": "https://www.udom.ac.tz/academic-calendar"
    }
    resources_sw = {
        "ratiba": "https://ratiba.udom.ac.tz",
        "maktaba": "https://library.udom.ac.tz",
        "tovuti_ya_wanafunzi": "https://portal.udom.ac.tz",
        "masomo_mtandaoni": "https://elearning.udom.ac.tz",
        "kalenda_ya_masomo": "https://www.udom.ac.tz/academic-calendar"
    }
    return {
        "language": language,
        "resources": resources_sw if language == "Swahili" else resources_en
    }

@app.get("/")
async def root():
    return {
        "message": "Welcome to CiveGPT – your intelligent assistant from the College of Informatics and Virtual Education. I can help with studies, career, daily tasks, and answer questions about UDOM.",
        "version": "3.1.0",
        "status": "operational",
        "features": [
            "General knowledge and Q&A",
            "Academic support (explanations, writing help)",
            "Career guidance (CV, interviews, job search)",
            "UDOM campus information and resources",
            "Multi-language support (English/Swahili)"
        ]
    }

@app.get("/health")
async def health():
    start_time = time.time()
    try:
        test_completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": "Say 'CiveGPT OK' if working."}],
            max_tokens=10,
            temperature=0.1
        )
        status = "healthy"
    except Exception as e:
        status = f"degraded: {str(e)}"
    response_time = time.time() - start_time
    return {
        "status": status,
        "response_time": round(response_time, 2),
        "service": "CiveGPT",
        "model": "llama-3.3-70b-versatile"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)