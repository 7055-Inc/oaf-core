"use strict";exports.id=902,exports.ids=[902],exports.modules={3902:(t,e,o)=>{o.r(e),o.d(e,{default:()=>r});var a=o(6941);class n{constructor(t){this.siteConfig=t,this.initialized=!1,this.formId="contact-form-addon"}init(){this.initialized||(this.injectStyles(),this.addContactNavigation(),this.setupContactPageRouting(),this.initialized=!0)}injectStyles(){let t=`
      <style id="contact-form-addon-styles">
        .contact-form-addon {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .contact-form-addon h2 {
          color: var(--text-color, #374151);
          margin-bottom: 20px;
          font-size: 1.8rem;
        }
        
        .contact-form-addon .form-group {
          margin-bottom: 20px;
        }
        
        .contact-form-addon label {
          display: block;
          margin-bottom: 5px;
          font-weight: 600;
          color: var(--text-color, #374151);
        }
        
        .contact-form-addon input,
        .contact-form-addon textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 6px;
          font-size: 16px;
          transition: border-color 0.3s ease;
          box-sizing: border-box;
        }
        
        .contact-form-addon input:focus,
        .contact-form-addon textarea:focus {
          outline: none;
          border-color: var(--main-color, #667eea);
        }
        
        .contact-form-addon textarea {
          min-height: 120px;
          resize: vertical;
        }
        
        .contact-form-addon .submit-btn {
          background: var(--main-color, #667eea);
          color: white;
          padding: 14px 28px;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .contact-form-addon .submit-btn:hover {
          background: var(--secondary-color, #764ba2);
          transform: translateY(-1px);
        }
        
        .contact-form-addon .submit-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
          transform: none;
        }
        
        .contact-form-addon .success-message {
          background: #10b981;
          color: white;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
          text-align: center;
        }
        
        .contact-form-addon .error-message {
          background: #ef4444;
          color: white;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
          text-align: center;
        }
        
        .contact-form-addon .loading {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s ease-in-out infinite;
          margin-right: 10px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          .contact-form-addon {
            margin: 10px;
            padding: 15px;
          }
        }
      </style>
    `;document.head.insertAdjacentHTML("beforeend",t)}addContactNavigation(){let t=document.querySelector("nav");if(t){let e=document.createElement("a");e.href="#contact";let o=t.querySelector("a");o&&(e.className=o.className),e.textContent="Contact",e.onclick=t=>{t.preventDefault(),this.showContactPage()},t.appendChild(e)}}setupContactPageRouting(){}showContactPage(){let t=document.querySelector(".storefront")||document.querySelector('[class*="storefront"]')||document.querySelector("main")||document.querySelector("#__next > div > div");if(t){let e=document.querySelector("header"),o="";e&&(o=e.outerHTML),t.innerHTML=`
        ${o}
        <div class="contact-page-container" style="padding: 40px 20px; min-height: 60vh;">
          <div class="container" style="max-width: 800px; margin: 0 auto;">
            <div id="contact-form-container"></div>
          </div>
        </div>
      `,this.createContactForm("contact-form-container")}}createContactForm(t="contact-form-container"){let e=document.getElementById(t);e&&(e.innerHTML=`
      <div class="contact-form-addon">
        <h2>Contact Us</h2>
        <div id="contact-form-messages"></div>
        
        <form id="${this.formId}" novalidate>
          <div class="form-group">
            <label for="contact-name">Name *</label>
            <input 
              type="text" 
              id="contact-name" 
              name="name" 
              required 
              maxlength="100"
            >
          </div>
          
          <div class="form-group">
            <label for="contact-email">Email *</label>
            <input 
              type="email" 
              id="contact-email" 
              name="email" 
              required 
              maxlength="150"
            >
          </div>
          
          <div class="form-group">
            <label for="contact-phone">Phone</label>
            <input 
              type="tel" 
              id="contact-phone" 
              name="phone" 
              maxlength="20"
            >
          </div>
          
          <div class="form-group">
            <label for="contact-message">Message *</label>
            <textarea 
              id="contact-message" 
              name="message" 
              required 
              maxlength="2000"
              placeholder="Tell us how we can help you..."
            ></textarea>
          </div>
          
          <!-- Hidden honeypot for spam protection -->
          <input type="text" name="website" style="display: none;" tabindex="-1">
          
          <button type="submit" class="submit-btn" id="contact-submit">
            Send Message
          </button>
        </form>
      </div>
    `,this.attachFormHandlers())}attachFormHandlers(){let t=document.getElementById(this.formId),e=document.getElementById("contact-submit"),o=document.getElementById("contact-form-messages");t&&t.addEventListener("submit",async n=>{n.preventDefault(),o.innerHTML="",e.disabled=!0,e.innerHTML='<span class="loading"></span>Sending...';try{let e=new FormData(t),n=e.get("name").trim(),r=e.get("email").trim(),i=e.get("message").trim();if(e.get("website"))throw Error("Spam detected");if(!n||!r||!i)throw Error("Please fill in all required fields");if(!this.isValidEmail(r))throw Error("Please enter a valid email address");let d=await fetch((0,a.e9)("api/v2/websites/addons/contact/submit"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({siteId:this.siteConfig.siteId,name:n,email:r,phone:e.get("phone").trim(),message:i,timestamp:new Date().toISOString()})});if(!d.ok){let t=await d.json();throw Error(t.error?.message||t.error||"Failed to send message")}o.innerHTML='<div class="success-message">Thank you for contacting us! We\'ll get back to you soon.</div>',t.reset()}catch(t){o.innerHTML=`<div class="error-message">${t.message}</div>`}finally{e.disabled=!1,e.innerHTML="Send Message"}})}isValidEmail(t){return/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)}renderContactPage(){return`
      <div class="container" style="padding: 40px 20px;">
        <div id="contact-form-container"></div>
      </div>
    `}}let r=n}};