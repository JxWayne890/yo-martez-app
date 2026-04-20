function wrapEmail(content: string): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#ffffff;padding:30px;max-width:600px;margin:auto;color:#333;">
      <div style="text-align:center;">
        <img src="https://yomartez.com/cdn/shop/files/yomartez_logo.PNG?v=1615922940" alt="Yo! Martez" style="max-width:200px;margin-bottom:20px;">
      </div>
      ${content}
    </div>
  `;
}

function cta(label: string, href: string): string {
  return `
    <div style="text-align:center;margin:40px 0;">
      <a href="${href}" style="background-color:#8A2BE2;color:white;padding:14px 26px;text-decoration:none;border-radius:6px;font-weight:600;">
        ${label}
      </a>
    </div>
  `;
}

export function buildAccessRequestEmail(firstName: string): { subject: string; html: string } {
  return {
    subject: `Yo! Password Request Is In - Just One More Thing, ${firstName}`,
    html: wrapEmail(`
      <h2 style="text-align:center;">Yo! Access Request Has Been Received</h2>
      <p>Hey ${firstName},</p>
      <p>We saw you requested the password to join the Yo! Community, and we are excited to welcome you in.</p>
      <p>Before we send over the members-only password, follow us on Instagram, Facebook, and TikTok, then reply with proof so we can unlock access for you.</p>
      <p>Once we receive that, we will send your password right away.</p>
      ${cta("Visit Yo! Martez", "https://yomartez.com")}
      <p>- Yo! Martez</p>
    `),
  };
}

export function buildAccessGrantedEmail(firstName: string, password: string): { subject: string; html: string } {
  return {
    subject: "Congrats, Yo! Access Granted!",
    html: wrapEmail(`
      <h2 style="text-align:center;">Yo! Access Approved</h2>
      <p>Hey ${firstName},</p>
      <p>You are officially part of the Yo! Community.</p>
      <p>Here is your current members-only password:</p>
      <p style="text-align:center;font-size:28px;font-weight:bold;">${password}</p>
      ${cta("Go To Yo! Store", "https://yomartez.com")}
      <p>- Yo! Martez</p>
    `),
  };
}

export function buildMembersReminderEmail(firstName: string): { subject: string; html: string } {
  return {
    subject: `${firstName}, You unlocked the door but did not walk in`,
    html: wrapEmail(`
      <h2 style="text-align:center;">Everything okay, ${firstName}?</h2>
      <p>We noticed you were granted access to the members-only store, but have not checked out yet.</p>
      <p>If something got in the way, just reply and we will help.</p>
      ${cta("Go To Yo! Store", "https://yomartez.com")}
      <p>- Yo! Martez</p>
    `),
  };
}

export function buildPasswordBroadcastEmail(firstName: string, password: string): { subject: string; html: string } {
  return {
    subject: `${firstName}, Yo! New Exclusive Store Password Is Inside`,
    html: wrapEmail(`
      <h2 style="text-align:center;">Yo! New Store Password</h2>
      <p>Heads up. We refreshed the lock on the members-only store.</p>
      <p style="text-align:center;font-size:28px;font-weight:bold;">${password}</p>
      ${cta("Enter Yo! Store", "https://yomartez.com")}
      <p>- Yo! Martez</p>
    `),
  };
}

export function buildBirthdayEmail(
  stage: "pre" | "day" | "last_call",
  firstName: string
): { subject: string; html: string } {
  if (stage === "pre") {
    return {
      subject: `${firstName}, You ready for Yo! surprise?`,
      html: wrapEmail(`
        <h2 style="text-align:center;">Yo! Birthday Is Almost Here</h2>
        <p>Hey ${firstName}, your birthday is coming up fast and we have a surprise waiting.</p>
        ${cta("Get Ready", "https://yomartez.com")}
        <p>- Yo! Martez</p>
      `),
    };
  }

  if (stage === "day") {
    return {
      subject: `Happy Birthday, ${firstName}!`,
      html: wrapEmail(`
        <h2 style="text-align:center;">Happy Birthday, ${firstName}!</h2>
        <p>Use code <strong>BDAY15</strong> today for 15% off your order.</p>
        ${cta("Shop Now", "https://yomartez.com")}
        <p>- Yo! Martez</p>
      `),
    };
  }

  return {
    subject: `${firstName}, last chance to use Yo! birthday code`,
    html: wrapEmail(`
      <h2 style="text-align:center;">You Haven't Used Yo! Birthday Gift Yet</h2>
      <p>Your 15% birthday code <strong>BDAY15</strong> is still here, but not for long.</p>
      ${cta("Redeem My Gift", "https://yomartez.com")}
      <p>- Yo! Martez</p>
    `),
  };
}

export function buildPostPurchaseEmail(
  stageDays: 2 | 5 | 7 | 14 | 21 | 30,
  firstName: string
): { subject: string; html: string } {
  const content: Record<number, { subject: string; heading: string; body: string; button: string }> = {
    2: {
      subject: `${firstName}, While You Wait, Here's What's Poppin'`,
      heading: "Ready to rep Yo! in style?",
      body: "Your order is on the way, and we wanted to show you more from the collection while you wait.",
      button: "Shop the Full Collection",
    },
    5: {
      subject: `${firstName}, Join the Mission. Rep the Message.`,
      heading: "Our Mission Is Movement",
      body: "Yo! Martez is more than style. It is statement, purpose, and voice.",
      button: "Shop What's New",
    },
    7: {
      subject: `${firstName}, Thanks for Yo! Order - Mind Dropping a Quick Review?`,
      heading: "Thanks for Yo! Support",
      body: "If you are enjoying your order, we would love a quick review.",
      button: "Leave a Google Review",
    },
    14: {
      subject: `${firstName}, Quick Check-In: How's Yo! Fit Holding Up?`,
      heading: "How's Yo! Gear holding up?",
      body: "If you need anything, just reply and we will help.",
      button: "Contact Support",
    },
    21: {
      subject: `${firstName}, Love Yo! Gear? Tell the World!`,
      heading: "Got a minute?",
      body: "If your order made an impression, a review would mean a lot to us.",
      button: "Leave a Review",
    },
    30: {
      subject: `${firstName}, Yo! Follow Along - Big Things Are Coming`,
      heading: "We're just getting started",
      body: "Thanks again for rolling with Yo! Martez. More drops and perks are on the way.",
      button: "Follow the Movement",
    },
  };

  const selected = content[stageDays];
  const href = stageDays === 7 || stageDays === 21
    ? "https://maps.app.goo.gl/yTH1EKyVxdjWo36R9"
    : stageDays === 14
      ? "mailto:support@yomartez.com"
      : "https://yomartez.com/collections/all";

  return {
    subject: selected.subject,
    html: wrapEmail(`
      <h2 style="text-align:center;">${selected.heading}</h2>
      <p>Hey ${firstName},</p>
      <p>${selected.body}</p>
      ${cta(selected.button, href)}
      <p>- Yo! Martez</p>
    `),
  };
}

interface ReengagementProduct {
  title: string;
  handle: string;
  image?: string | null;
}

export function buildReengagementProductGrid(products: ReengagementProduct[]): string {
  const filtered = products
    .filter((p) => !/test/i.test(p.title))
    .filter((p) => !p.image || !p.image.includes("placeholder.com"))
    .slice(0, 4);

  if (filtered.length === 0) return "";

  const cells = filtered.map((product) => {
    const url = `https://yomartez.com/products/${product.handle}`;
    return `<td style="width: 50%; padding: 15px; text-align: center;">
  <a href="${url}" target="_blank">
    <img src="${product.image || ""}" alt="${product.title}" style="width: 100%; max-width: 240px; border-radius: 8px;" />
  </a>
  <p style="font-size: 16px; margin-top: 10px; font-weight: 600;">${product.title}</p>
</td>`;
  });

  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += 2) {
    const second = cells[i + 1] || `<td style="width: 50%; padding: 15px;"></td>`;
    rows.push(`<tr>${cells[i]}${second}</tr>`);
  }

  return rows.join("\n");
}

export function buildReengagementEmail(
  stageDays: 45 | 60 | 75 | 90,
  firstName: string,
  productRows = ""
): { subject: string; html: string } {
  const name = firstName;

  if (stageDays === 45) {
    return {
      subject: "The Movement Hasn't Stopped. Neither Have Yo! Perks",
      html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff; padding: 30px; max-width: 600px; margin: auto; color: #333;">
  <div style="text-align: center;">
    <img src="https://yomartez.com/cdn/shop/files/yomartez_logo.PNG?v=1615922940" alt="Yo! Martez" style="max-width: 200px; margin-bottom: 20px;">
  </div>
  <h2 style="text-align: center;">We're just getting started, ${name}.</h2>
  <p style="font-size: 16px; line-height: 1.5;">It's been a minute since you checked in with Yo! — and we just want to say thanks again for rolling with us.</p>
  <p style="font-size: 16px; line-height: 1.5;">Yo! support means the world. Every order fuels something bigger — a culture, a cause, and a community built on real impact.</p>
  <p style="font-size: 16px; line-height: 1.5;">🔥 New drops? On the way.<br>🎁 Surprise giveaways? Always cooking.<br>💡 Perks & exclusives? You already know.</p>
  <p style="font-size: 16px; line-height: 1.5;">If you're not already tapped in with us on socials, now's the time:</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="https://www.instagram.com/yomartez/?hl=en" style="margin: 0 10px;">
      <img src="https://www.pagetraffic.com/blog/wp-content/uploads/2022/06/new-instagram-transparent-full-color-logo.png" alt="Instagram" style="width: 40px;">
    </a>
    <a href="https://www.facebook.com/yomartez" style="margin: 0 10px;">
      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Facebook_Logo_2023.png/1200px-Facebook_Logo_2023.png?20231011121526" alt="Facebook" style="width: 40px;">
    </a>
  </div>
  <div style="text-align: center; margin: 40px 0;">
    <a href="https://yomartez.com" style="background-color: #7D3AED; color: white; padding: 14px 28px; text-decoration: none; font-size: 16px; border-radius: 8px; display: inline-block;">
      Visit Yo! Store
    </a>
  </div>
  <p style="font-size: 16px; line-height: 1.5;">We've got so much more in store — and you're already part of it.</p>
  <p style="font-size: 16px; line-height: 1.5;">Until next time... stay bold, stay rooted, and rep Yo! Brand with pride.</p>
  <p style="margin-top: 40px; font-size: 16px;">Much love,</p>
  <p style="font-size: 16px;">— Yo! Martez</p>
</div>`,
    };
  }

  if (stageDays === 60) {
    return {
      subject: "Yo! We Dropped These While You Were Gone",
      html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff; padding: 30px; max-width: 600px; margin: auto; color: #333;">
  <div style="text-align: center;">
    <img src="https://yomartez.com/cdn/shop/files/yomartez_logo.PNG?v=1615922940" alt="Yo! Martez" style="max-width: 200px; margin-bottom: 20px;">
  </div>
  <h2 style="text-align: center;">Yo! ${name}, we dropped these while you were gone.</h2>
  <p style="font-size: 16px; line-height: 1.5; text-align: center;">
    It's been a minute since Yo! last checked in — and we've been busy.
    Here are a few of the latest drops you might've missed:
  </p>
  <h3 style="text-align: center; font-size: 20px; margin-top: 40px;">🔥 Products You Missed</h3>
  <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 20px;">
    ${productRows}
  </table>
  <div style="text-align: center; margin: 40px 0;">
    <a href="https://yomartez.com" style="background-color: #7D3AED; color: white; padding: 14px 28px; text-decoration: none; font-size: 16px; border-radius: 8px; display: inline-block;">
      See Everything New
    </a>
  </div>
  <p style="font-size: 16px; line-height: 1.5; text-align: center;">
    We'd love to see you back. Stay bold. Stay rooted. Rep Yo! Brand with pride.
  </p>
  <p style="margin-top: 40px; font-size: 16px; text-align: center;">Much love,</p>
  <p style="font-size: 16px; text-align: center;">— Yo! Martez</p>
</div>`,
    };
  }

  if (stageDays === 75) {
    return {
      subject: "Yo! Comeback Code Inside: 15% OFF Just for You 👊",
      html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff; padding: 30px; max-width: 600px; margin: auto; color: #333;">
  <div style="text-align: center;">
    <img src="https://yomartez.com/cdn/shop/files/yomartez_logo.PNG?v=1615922940" alt="Yo! Martez" style="max-width: 200px; margin-bottom: 20px;">
  </div>
  <h2 style="text-align: center;">Yo! ${name}, we miss having you around.</h2>
  <p style="font-size: 16px; line-height: 1.5; text-align: center;">
    It's been 75 days since Yo! last visit?! Well, we're ready to welcome you back with something solid.
  </p>
  <p style="font-size: 16px; line-height: 1.5; text-align: center;">
    Use code <strong>COMEBACK15</strong> at checkout to unlock <strong>15% OFF</strong> anything in the store.
    But act fast — this one's a limited drop.
  </p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="https://yomartez.com" style="background-color: #7D3AED; color: white; padding: 14px 28px; text-decoration: none; font-size: 16px; border-radius: 8px; display: inline-block;">
      Use COMEBACK15 Now
    </a>
  </div>
  <p style="font-size: 16px; line-height: 1.5; text-align: center;">
    Yo! Brand is growing — new drops, new statements, and the same real ones at the core.
    Let's keep building something bold together.
  </p>
  <p style="margin-top: 40px; font-size: 16px; text-align: center;">Much love,</p>
  <p style="font-size: 16px; text-align: center;">— Yo! Martez</p>
</div>`,
    };
  }

  return {
    subject: "Last Call: Yo! 15% OFF Code's Almost Gone",
    html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff; padding: 30px; max-width: 600px; margin: auto; color: #333;">
  <div style="text-align: center;">
    <img src="https://yomartez.com/cdn/shop/files/yomartez_logo.PNG?v=1615922940" alt="Yo! Martez" style="max-width: 200px; margin-bottom: 20px;">
  </div>
  <h2 style="text-align: center;">Yo! ${name}, that exclusive code won't be around much longer.</h2>
  <p style="font-size: 16px; line-height: 1.5; text-align: center;">
    Just a heads up — your <strong>15% OFF</strong> code <strong>COMEBACK15</strong> is close to expiring.
  </p>
  <p style="font-size: 16px; line-height: 1.5; text-align: center;">
    If you've been thinking about making your next move, now's the time to slide back in.
    We'd hate for you to miss it.
  </p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="https://yomartez.com" style="background-color: #7D3AED; color: white; padding: 14px 28px; text-decoration: none; font-size: 16px; border-radius: 8px; display: inline-block;">
      Use COMEBACK15 Before It's Gone
    </a>
  </div>
  <p style="font-size: 16px; line-height: 1.5; text-align: center;">
    New drops. Real stories. Strong community.
    Let's keep Yo! journey going — together.
  </p>
  <p style="margin-top: 40px; font-size: 16px; text-align: center;">Much love,</p>
  <p style="font-size: 16px; text-align: center;">— Yo! Martez</p>
</div>`,
  };
}

export function buildVipEmail(
  tier: "mvp" | "all_star" | "legend",
  firstName: string
): { subject: string; html: string } {
  const content = {
    mvp: {
      subject: "Yo! MVP Status: Officially Unlocked",
      heading: "Welcome to Yo! MVP Circle",
      body: "You are one of the real ones helping power this movement.",
    },
    all_star: {
      subject: "Yo! All-Star Access Has Been Granted",
      heading: "Yo! All-Star Access Has Been Granted",
      body: "Your loyalty keeps pushing this mission forward.",
    },
    legend: {
      subject: "Yo! Legend Status: Officially Activated",
      heading: "Yo! Legend Status: Officially Activated",
      body: "You are part of the inner circle now. Thank you for carrying this vision with us.",
    },
  } as const;

  const selected = content[tier];

  return {
    subject: selected.subject,
    html: wrapEmail(`
      <h2 style="text-align:center;">${selected.heading}</h2>
      <p>Hey ${firstName},</p>
      <p>${selected.body}</p>
      ${cta("Explore What's Next", "https://yomartez.com/collections/all")}
      <p>- Yo! Martez</p>
    `),
  };
}
