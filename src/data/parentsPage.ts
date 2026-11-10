// Copy for the parent campaign page (/[locale]/parents-v2), from "Etijahi Parent Campaign: Google Ads Keywords and Landing
// Page Copy" (Noora, 10 Nov 2026), with the review comments applied:
//  - Arabic headline: «يساعده على أن يعرف نفسه» (ساعد takes على)
//  - age FAQ: from 16 (confirmed by Noora)
//  - report list: internships for students, entry-level jobs for graduates (what the report really contains)
//  - prices are not written here: the page shows them in the visitor's currency (SAR for Saudi visitors)
// Arabic is written as Arabic copy in its own right (not translated). It needs a native read before launch.
// No em dashes. Never "free" / مجاناً. The report recommends careers and what to study for each: never "a list of majors".

export type Bi = { en: string; ar: string }

export const PARENTS = {
  nav: { cta: { en: 'Get access', ar: 'احصل على التقييم' } as Bi },

  hero: {
    headline: { en: 'You know your child. Etijahi helps them know themselves.', ar: 'أنت تعرف ابنك، وإتجاهي يساعده على أن يعرف نفسه.' } as Bi,
    sub: {
      en: 'Your son or daughter completes a 15-minute assessment. You then read their report together: their strengths, interests and personality, the careers that genuinely suit them, what to study for each, and a plan you can work on side by side.',
      ar: 'يُكمل ابنك أو ابنتك تقييماً مدته ١٥ دقيقة، ثم تقرآن تقريره معاً: نقاط قوته، وميوله، وشخصيته، والمهن التي تناسبه فعلاً، وما يحتاج إلى دراسته لكل منها، مع خطة عملية تعملان عليها جنباً إلى جنب.',
    } as Bi,
    cta: { en: 'Get access to the assessment', ar: 'احصل على التقييم' } as Bi,
    note: { en: 'One-time payment. You’ll receive a personal link to share with your child.', ar: 'دفعة واحدة. يصلك رابط خاص ترسله لابنك أو ابنتك.' } as Bi,
    // Short facts under the button, taken from the copy elsewhere on the page.
    facts: [
      { en: 'About 15 minutes', ar: 'نحو ١٥ دقيقة' },
      { en: 'Arabic or English', ar: 'بالعربية أو الإنجليزية' },
      { en: 'One-time payment, no subscription', ar: 'دفعة واحدة، دون اشتراك' },
    ] as Bi[],
  },

  problem: {
    title: { en: 'Wanting to help is the easy part.', ar: 'الرغبة في مساعدته سهلة، لكن من أين تبدأ؟' } as Bi,
    p1: {
      en: 'Maybe your child is drawn to a field you never worked in, or a career that barely existed when you were their age. Maybe they like several things and can’t settle on one. Or maybe every time you ask what they want to do, the answer is “I don’t know yet.”',
      ar: 'ربما يميل ابنك إلى مجال لم تعمل فيه يوماً، أو إلى مهنة لم تكن معروفة حين كنت في عمره. وربما تتعدد اهتماماته فلا يستقر على أحدها. أو ربما يجيبك كلما سألته عمّا يريد: «ما أدري للحين».',
    } as Bi,
    p2: {
      en: 'You want to stand beside them without choosing for them. You’re just not sure where to start, or which questions will actually help.',
      ar: 'تريد أن تقف بجانبه دون أن تختار عنه، لكنك لا تعرف من أين تبدأ الحديث، ولا أي الأسئلة ستقرّبكما من قرار واضح.',
    } as Bi,
  },

  solution: {
    title: { en: 'Something clear to talk about.', ar: 'حديث مبني على شيء واضح' } as Bi,
    p1: {
      en: 'Etijahi gives your child a way to understand themselves, and gives you both something concrete to talk about. The assessment explores what they enjoy, what matters to them, how they like to work, and where they naturally do well. It then shows the careers that suit them, why, and what they would need to study to get there.',
      ar: 'إتجاهي يمنح ابنك فرصة ليفهم نفسه، ويمنحكما معاً ما تتحدثان عنه بوضوح. يتعرّف التقييم على ما يستمتع به، وما يهمّه، وطريقته المفضلة في العمل، وما يبرع فيه بطبيعته، ثم يوضّح المهن التي تناسبه، وسبب ملاءمتها له، وما يحتاج إلى دراسته للوصول إليها.',
    } as Bi,
    // The path the assessment follows, in the words of the paragraph above.
    explores: [
      { en: 'What they enjoy', ar: 'ما يستمتع به' },
      { en: 'What matters to them', ar: 'ما يهمّه' },
      { en: 'How they like to work', ar: 'طريقته المفضلة في العمل' },
      { en: 'Where they naturally do well', ar: 'ما يبرع فيه بطبيعته' },
    ] as Bi[],
    shows: [
      { en: 'The careers that suit them', ar: 'المهن التي تناسبه' },
      { en: 'Why they suit them', ar: 'سبب ملاءمتها له' },
      { en: 'What to study to get there', ar: 'ما يحتاج إلى دراسته للوصول إليها' },
    ] as Bi[],
    p2: {
      en: 'It’s built on 15 years of career guidance by Etijah Coaching & Consulting, working with students and professionals across the Gulf.',
      ar: 'صُمّم إتجاهي على خبرة ١٥ عاماً من الإرشاد المهني قدّمتها اتجاه للإرشاد والاستشارات للطلاب والمهنيين في الخليج.',
    } as Bi,
  },

  how: {
    title: { en: 'Your part, their part, and the part you share.', ar: 'دورك، ودوره، وما تتشاركان فيه' } as Bi,
    cols: [
      {
        head: { en: 'Your part', ar: 'دورك' } as Bi,
        items: [
          { en: 'Pay once to get access to the assessment. No subscription.', ar: 'احصل على التقييم بدفعة واحدة، دون اشتراك.' },
          { en: 'Straight after payment, receive your child’s personal link by email and on screen, and send it to them. WhatsApp works perfectly.', ar: 'بعد الدفع مباشرة، يصلك الرابط الخاص بابنك عبر البريد الإلكتروني وعلى الشاشة، فأرسله إليه، والواتساب يكفي.' },
        ] as Bi[],
      },
      {
        head: { en: 'Their part', ar: 'دوره' } as Bi,
        items: [
          { en: 'Your son or daughter completes the assessment on their own, in about 15 minutes, in Arabic or English.', ar: 'يُكمل ابنك أو ابنتك التقييم بنفسه في نحو ١٥ دقيقة، بالعربية أو الإنجليزية.' },
        ] as Bi[],
      },
      {
        head: { en: 'Together', ar: 'معاً' } as Bi,
        items: [
          { en: 'Read the full report together and talk through what it shows.', ar: 'اقرآ التقرير الكامل معاً، وتحدّثا عمّا يكشفه.' },
          { en: 'Work on the 90-day plan together, one practical step at a time.', ar: 'اعملا معاً على خطة الـ ٩٠ يوماً، خطوة عملية تلو الأخرى.' },
        ] as Bi[],
      },
    ],
    why: {
      en: 'Why your child should answer alone: the report is only as accurate as the answers. If you answer for them, you’ll get a report about how you see them, not who they are.',
      ar: 'لماذا يجيب ابنك بنفسه؟ دقة التقرير من صدق الإجابات. إن أجبت نيابةً عنه، فستحصل على تقرير يصف نظرتك إليه، لا حقيقته.',
    } as Bi,
  },

  read: {
    title: { en: 'What you’ll read together', ar: 'ما ستقرآنه معاً' } as Bi,
    // Confirmed against the paid report (Noora, 10 Nov). Jobs line: students get internships, graduates get entry-level jobs.
    items: [
      { en: 'What your child enjoys, values and does well, in plain language.', ar: 'ما يستمتع به ابنك، وما يهمّه، وما يبرع فيه، بلغة واضحة وبسيطة.' },
      { en: 'The careers that suit them, and why each one connects to their answers.', ar: 'المهن التي تناسبه، وسبب ارتباط كل منها بإجاباته.' },
      { en: 'What to study or learn for each career, so the path from school to work is clearer.', ar: 'ما يحتاج إلى دراسته أو تعلّمه لكل مهنة، ليتضح الطريق من المدرسة إلى العمل.' },
      { en: 'How each suggested career is changing, so an unfamiliar field becomes easier to understand.', ar: 'كيف تتغيّر كل مهنة مقترحة، ليصبح المجال غير المألوف لك أوضح وأسهل فهماً.' },
      { en: 'The skills worth building now, with courses and certifications for each path.', ar: 'المهارات التي تستحق أن يبنيها من الآن، مع دورات وشهادات مرتبطة بكل مسار.' },
      { en: 'Internship opportunities connected to their profile (and entry-level jobs for graduates).', ar: 'فرص تدريب مرتبطة بملفه (ووظائف مبتدئين للخريجين).' },
      { en: 'A 90-day plan that starts with one practical step this week.', ar: 'خطة لـ ٩٠ يوماً تبدأ بخطوة عملية هذا الأسبوع.' },
      { en: 'The full report in Arabic or English, online or as a PDF.', ar: 'التقرير كاملاً بالعربية أو الإنجليزية، للقراءة عبر الإنترنت أو بصيغة PDF.' },
    ] as Bi[],
    coach: {
      en: 'Want to talk it through with a career coach? Add a one-to-one session with an Etijah coach.',
      ar: 'تودّ مناقشة النتائج مع مرشد مهني؟ أضف جلسة فردية مع أحد مرشدي اتجاه.',
    } as Bi,
  },

  pricing: {
    title: { en: 'Your child’s full career report', ar: 'التقرير المهني الكامل لابنك' } as Bi,
    packageName: { en: 'Pathfinder', ar: 'مرشد المسار' } as Bi,
    underPrice: { en: 'One-time payment · Tax included · No subscription', ar: 'دفعة واحدة · شامل الضريبة · دون اشتراك' } as Bi,
    included: { en: 'Everything listed in “What you’ll read together”', ar: 'كل ما ورد في «ما ستقرآنه معاً»' } as Bi,
    button: { en: 'Pay and get my child’s link', ar: 'ادفع واحصل على رابط ابنك' } as Bi,
    underButton: { en: 'Your child’s personal link arrives straight after payment, by email and on screen.', ar: 'يصلك رابط ابنك الخاص فور الدفع، عبر البريد الإلكتروني وعلى الشاشة.' } as Bi,
    addOnName: { en: 'With a coaching session', ar: 'مع جلسة إرشاد' } as Bi,
    addOn: {
      en: 'The full report, plus a one-to-one session with an Etijah coach to talk through the results.',
      ar: 'التقرير الكامل، مع جلسة فردية مع أحد مرشدي اتجاه لمناقشة النتائج.',
    } as Bi,
    addOnButton: { en: 'Pay and get the link + coaching session', ar: 'ادفع واحصل على الرابط مع جلسة الإرشاد' } as Bi,
    soon: { en: 'Payment opens soon', ar: 'الدفع متاح قريباً' } as Bi,
  },

  closing: {
    title: { en: 'Give them clarity before the big decisions.', ar: 'امنحه الوضوح قبل قراراته الكبيرة.' } as Bi,
    cta: { en: 'Get access to the assessment', ar: 'احصل على التقييم' } as Bi,
    trust: { en: 'One-time payment · Tax included · No subscription', ar: 'دفعة واحدة | شامل الضريبة | دون اشتراك' } as Bi,
    sample: { en: 'See a sample report', ar: 'اطّلع على نموذج التقرير' } as Bi,
  },

  faqTitle: { en: 'Questions parents ask', ar: 'أسئلة يطرحها أولياء الأمور' } as Bi,
  faq: [
    {
      q: { en: 'Who completes the assessment?', ar: 'من يُكمل التقييم؟' },
      a: { en: 'Your child. You pay, receive the link and share it with them. They answer on their own, because honest answers are what make the report accurate.', ar: 'ابنك أو ابنتك. أنت تدفع وتستلم الرابط وتشاركه معه، وهو يجيب بنفسه، لأن صدق إجاباته هو ما يجعل التقرير دقيقاً.' },
    },
    {
      q: { en: 'Can I answer on their behalf?', ar: 'هل أستطيع الإجابة نيابةً عنه؟' },
      a: { en: 'We’d advise against it. The report would then describe how you see your child, not how they see themselves.', ar: 'لا ننصح بذلك، فالتقرير حينها سيصف نظرتك إليه، لا نظرته إلى نفسه.' },
    },
    {
      q: { en: 'What age is it designed for?', ar: 'لأي عمر صُمّم التقييم؟' },
      // Minimum age 16 confirmed by Noora (10 Nov). Not yet enforced in the assessment itself.
      a: { en: 'High school and university students, from age 16.', ar: 'لطلاب المرحلة الثانوية والجامعة، من عمر ١٦ سنة.' },
    },
    {
      q: { en: 'How do I send the link?', ar: 'كيف أرسل الرابط؟' },
      a: { en: 'You’ll receive it by email and on screen straight after payment. Most parents send it on WhatsApp.', ar: 'يصلك عبر البريد الإلكتروني وعلى الشاشة فور الدفع، ويرسله معظم أولياء الأمور عبر الواتساب.' },
    },
    {
      q: { en: 'Will I see the results?', ar: 'هل سأطّلع على النتائج؟' },
      a: { en: 'Yes. The full report is available to both of you, so you can review it and work on the plan together.', ar: 'نعم، التقرير الكامل متاح لكما معاً، لتطّلعا عليه وتعملا على الخطة سوياً.' },
    },
    {
      q: { en: 'Will it tell my child which major to study?', ar: 'هل سيحدد التقرير التخصص الذي يدرسه ابني؟' },
      a: { en: 'It recommends careers that suit them and explains what to study for each one, so choosing a major becomes a clearer decision. The decision stays with your child.', ar: 'يقترح التقرير المهن التي تناسبه، ويوضّح ما يحتاج إلى دراسته لكل منها، فيصبح اختيار التخصص قراراً أوضح. ويبقى القرار له.' },
    },
    {
      q: { en: 'What if my child isn’t keen?', ar: 'ماذا لو لم يتحمّس ابني؟' },
      a: { en: 'Tell them it isn’t a test they can pass or fail. There are no right or wrong answers, it takes about 15 minutes, and it’s about them, not their grades.', ar: 'أخبره أنه ليس اختباراً فيه نجاح أو رسوب. لا توجد إجابات صحيحة أو خاطئة، ويستغرق نحو ١٥ دقيقة، وهو عنه هو، لا عن درجاته.' },
    },
    {
      q: { en: 'My child already did the school interests inventory. Is this different?', ar: 'سبق أن أجرى ابني مقياس الميول في المدرسة، فما الفرق؟' },
      a: { en: 'The school measure supports track placement. Etijahi looks further ahead: the careers that suit your child, what to study for each, how each field is changing, the skills to build, and a 90-day plan.', ar: 'يُستخدم مقياس المدرسة في التسكين على المسارات، أما إتجاهي فينظر أبعد: المهن التي تناسب ابنك، وما يدرسه لكل منها، وكيف يتغيّر كل مجال، والمهارات المطلوبة، وخطة عملية لـ ٩٠ يوماً.' },
    },
    {
      q: { en: 'Is my child’s data safe?', ar: 'هل بيانات ابني آمنة؟' },
      a: { en: 'Yes. Data is stored securely and never sold to third parties.', ar: 'نعم، تُحفظ البيانات بشكل آمن ولا تُباع لأي طرف خارجي.' },
    },
  ] as { q: Bi; a: Bi }[],
}
