import { NextRequest, NextResponse } from "next/server";

const WIDGET_CSS = `
#sl-chat-widget { position: fixed; z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
#sl-chat-widget[data-position="right"] { bottom: 24px; right: 24px; }
#sl-chat-widget[data-position="left"] { bottom: 24px; left: 24px; }
#sl-chat-button { width: 56px; height: 56px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(0,0,0,0.2); transition: transform 0.2s, box-shadow 0.2s; }
#sl-chat-button:hover { transform: scale(1.05); box-shadow: 0 6px 28px rgba(0,0,0,0.25); }
#sl-chat-panel { display: none; width: 360px; height: 520px; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.15); flex-direction: column; position: absolute; bottom: 68px; }
#sl-chat-panel.open { display: flex; }
#sl-chat-panel[data-position="right"] { right: 0; }
#sl-chat-panel[data-position="left"] { left: 0; }
#sl-chat-header { padding: 16px 20px; display: flex; align-items: center; gap: 12px; }
#sl-chat-header h3 { margin: 0; font-size: 15px; font-weight: 700; }
#sl-chat-close { background: none; border: none; color: inherit; opacity: 0.7; cursor: pointer; padding: 4px; border-radius: 6px; font-size: 18px; line-height: 1; margin-left: auto; }
#sl-chat-close:hover { opacity: 1; }
#sl-chat-messages { flex: 1; padding: 16px; overflow-y: auto; background: #f8fafc; display: flex; flex-direction: column; gap: 8px; }
#sl-chat-message-bot { background: white; padding: 12px 16px; border-radius: 12px; border-bottom-left-radius: 4px; font-size: 13px; line-height: 1.5; max-width: 85%; align-self: flex-start; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
#sl-chat-input-area { padding: 12px 16px; border-top: 1px solid #e5e7eb; display: flex; gap: 8px; background: white; }
#sl-chat-input { flex: 1; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 14px; font-size: 13px; outline: none; }
#sl-chat-input:focus { border-color: var(--sl-primary); }
#sl-chat-send { border: none; border-radius: 10px; padding: 10px 16px; font-size: 13px; font-weight: 600; color: white; cursor: pointer; }
#sl-chat-footer { padding: 8px 16px; text-align: center; font-size: 10px; opacity: 0.5; background: white; }
`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const websiteId = searchParams.get("websiteId");
  const primaryColor = searchParams.get("primaryColor") || "#6366f1";
  const position = searchParams.get("position") || "right";
  const greeting = searchParams.get("greeting") || "Hi! Thanks for visiting. How can I help?";
  const language = searchParams.get("language") || "en";

  const script = `
(function() {
  var existing = document.getElementById('sl-chat-widget');
  if (existing) return;

  var widget = document.createElement('div');
  widget.id = 'sl-chat-widget';
  widget.setAttribute('data-position', '${position}');
  document.body.appendChild(widget);

  var style = document.createElement('style');
  style.textContent = ':root { --sl-primary: ${primaryColor}; --sl-primary-dark: ${primaryColor}dd; }' + ${JSON.stringify(WIDGET_CSS)};
  document.head.appendChild(style);

  var button = document.createElement('button');
  button.id = 'sl-chat-button';
  button.style.cssText = 'background: ${primaryColor};';
  button.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 3-3h13a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11c0 1.1.9 2 2 2h2l-3 3z"/></svg>';
  widget.appendChild(button);

  var panel = document.createElement('div');
  panel.id = 'sl-chat-panel';
  panel.setAttribute('data-position', '${position}');
  panel.innerHTML = [
    '<div id="sl-chat-header" style="background:${primaryColor};color:white;">',
    '  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="m3 21 3-3h13a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11c0 1.1.9 2 2 2h2l-3 3z"/></svg>',
    '  <h3>Chat</h3>',
    '  <button id="sl-chat-close">&times;</button>',
    '</div>',
    '<div id="sl-chat-messages">',
    '  <div id="sl-chat-message-bot">${greeting}</div>',
    '</div>',
    '<div id="sl-chat-input-area">',
    '  <input id="sl-chat-input" type="text" placeholder="Type your message here..." />',
    '  <button id="sl-chat-send" style="background:${primaryColor};">Send</button>',
    '</div>',
    '<div id="sl-chat-footer">Powered by SiteLaunch AI</div>',
  ].join('');
  widget.appendChild(panel);

  button.addEventListener('click', function() {
    panel.classList.toggle('open');
    button.style.display = 'none';
  });
  document.getElementById('sl-chat-close').addEventListener('click', function() {
    panel.classList.remove('open');
    button.style.display = 'flex';
  });
  document.getElementById('sl-chat-send').addEventListener('click', function() {
    var input = document.getElementById('sl-chat-input');
    if (input.value.trim()) {
      var msg = document.createElement('div');
      msg.style.cssText = 'background:${primaryColor};color:white;padding:10px 14px;border-radius:12px;border-bottom-right-radius:4px;font-size:13px;line-height:1.5;max-width:85%;align-self:flex-end;';
      msg.textContent = input.value;
      document.getElementById('sl-chat-messages').appendChild(msg);
      input.value = '';
    }
  });
  document.getElementById('sl-chat-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('sl-chat-send').click();
  });
})();
`;

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=3600",
    },
  });
}