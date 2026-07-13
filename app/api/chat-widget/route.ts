import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const LANGUAGES = [
  { code: "en", name: "English", native: "English" },
  { code: "es", name: "Spanish", native: "Espanol" },
  { code: "fr", name: "French", native: "Francais" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "it", name: "Italian", native: "Italiano" },
  { code: "pt", name: "Portuguese", native: "Portugues" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "zh", name: "Chinese (Simplified)", native: "简体中文" },
  { code: "zh-TW", name: "Chinese (Traditional)", native: "繁體中文" },
  { code: "ar", name: "Arabic", native: "العربية" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "nl", name: "Dutch", native: "Nederlands" },
  { code: "sv", name: "Swedish", native: "Svenska" },
  { code: "da", name: "Danish", native: "Dansk" },
  { code: "no", name: "Norwegian", native: "Norsk" },
  { code: "fi", name: "Finnish", native: "Suomi" },
  { code: "pl", name: "Polish", native: "Polski" },
  { code: "tr", name: "Turkish", native: "Turkce" },
  { code: "th", name: "Thai", native: "ไทย" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt" },
];

// Simple translation dictionary for key phrases
const TRANSLATIONS: Record<string, Record<string, string>> = {
  "Welcome! How can I help you today?": {
    es: "Bienvenido! Como puedo ayudarte hoy?",
    fr: "Bienvenue! Comment puis-je vous aider aujourd'hui?",
    de: "Willkommen! Wie kann ich Ihnen heute helfen?",
    it: "Benvenuto! Come posso aiutarti oggi?",
    pt: "Bem-vindo! Como posso ajudar hoje?",
    ja: "いらっしゃいませ！今日はどのようなご用件ですか？",
    ko: "환영합니다! 오늘 무엇을 도와드릴까요?",
    zh: "欢迎！今天有什么可以帮您的？",
    ar: "أهلا بك! كيف يمكنني مساعدتك اليوم؟",
    hi: "आपका स्वागत है! आज मैं आपकी कैसे मदद कर सकता हूं?",
    ru: "Добро пожаловать! Чем я могу помочь вам сегодня?",
  },
  "Type your message here...": {
    es: "Escribe tu mensaje aqui...",
    fr: "Tapez votre message ici...",
    de: "Geben Sie Ihre Nachricht hier ein...",
    it: "Scrivi il tuo messaggio qui...",
    pt: "Digite sua mensagem aqui...",
    ja: "メッセージを入力してください...",
    ko: "메시지를 입력하세요...",
    zh: "在此输入您的消息...",
    ar: "اكتب رسالتك هنا...",
    hi: "अपना संदेश यहां लिखें...",
    ru: "Введите ваше сообщение здесь...",
  },
  "Send": {
    es: "Enviar", fr: "Envoyer", de: "Senden", it: "Invia",
    pt: "Enviar", ja: "送信", ko: "보내기", zh: "发送",
    ar: "إرسال", hi: "भेजें", ru: "Отправить",
  },
  "Powered by SiteLaunch": {
    es: "Desarrollado por SiteLaunch", fr: "Alimente par SiteLaunch",
    de: "Bereitgestellt von SiteLaunch", it: "Alimentato da SiteLaunch",
    pt: "Desenvolvido por SiteLaunch", ja: "SiteLaunch提供",
    ko: "SiteLaunch 제공", zh: "由SiteLaunch提供支持",
    ar: "مشغل بواسطة SiteLaunch", hi: "SiteLaunch द्वारा संचालित",
    ru: "Работает на SiteLaunch",
  },
  "Hi! Thanks for visiting. How can I help?": {
    es: "Hola! Gracias por visitarnos. Como puedo ayudar?",
    fr: "Bonjour! Merci de votre visite. Comment puis-je aider?",
    de: "Hallo! Danke fur Ihren Besuch. Wie kann ich helfen?",
    it: "Ciao! Grazie per la visita. Come posso aiutare?",
    pt: "Ola! Obrigado pela visita. Como posso ajudar?",
    ja: "こんにちは！ご来訪ありがとうございます。どのようにお手伝いできますか？",
    ko: "안녕하세요! 방문해 주셔서 감사합니다. 무엇을 도와드릴까요?",
    zh: "您好！感谢您的访问。有什么可以帮您的？",
    ar: "مرحبا! شكرا لزيارتك. كيف يمكنني المساعدة؟",
    hi: "नमस्ते! आने के लिए धन्यवाद। मैं कैसे मदद कर सकता हूं?",
    ru: "Здравствуйте! Спасибо за визит. Чем я могу помочь?",
  },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (type === "languages") {
    return NextResponse.json({ languages: LANGUAGES });
  }

  return NextResponse.json({ languages: LANGUAGES, translations: TRANSLATIONS });
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { websiteId, language, widgetConfig } = body;

    if (language && !LANGUAGES.find((l) => l.code === language)) {
      return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
    }

    // If just translating content, return translated phrases
    if (language && !widgetConfig) {
      const phrases: Record<string, string> = {};
      for (const [en, translations] of Object.entries(TRANSLATIONS)) {
        phrases[en] = translations[language] || en;
      }
      return NextResponse.json({ language, translations: phrases });
    }

    // If widget config is provided, generate embed code
    if (widgetConfig && websiteId) {
      const website = await prisma.website.findUnique({ where: { id: websiteId } });
      if (!website) {
        return NextResponse.json({ error: "Website not found" }, { status: 404 });
      }

      const { primaryColor = "#6366f1", position = "right", greeting = "Hi! Thanks for visiting. How can I help?", language: widgetLang = "en" } = widgetConfig;

      const embedCode = `<!-- SiteLaunch AI Chat Widget -->
<script>
(function() {
  var s = document.createElement('script');
  s.src = '${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/chat-widget/embed.js';
  s.setAttribute('data-website-id', '${websiteId}');
  s.setAttribute('data-primary-color', '${primaryColor}');
  s.setAttribute('data-position', '${position}');
  s.setAttribute('data-greeting', '${greeting}');
  s.setAttribute('data-language', '${widgetLang}');
  s.async = true;
  document.head.appendChild(s);
})();
</script>
<!-- End SiteLaunch AI Chat Widget -->`;

      return NextResponse.json({
        embedCode,
        config: { primaryColor, position, greeting, language: widgetLang },
        preview: {
          widget: {
            greeting: TRANSLATIONS[greeting]?.[widgetLang] || greeting,
            placeholder: TRANSLATIONS["Type your message here..."]?.[widgetLang] || "Type your message here...",
            sendLabel: TRANSLATIONS["Send"]?.[widgetLang] || "Send",
            poweredBy: TRANSLATIONS["Powered by SiteLaunch"]?.[widgetLang] || "Powered by SiteLaunch",
          },
        },
      });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("Chat widget error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}