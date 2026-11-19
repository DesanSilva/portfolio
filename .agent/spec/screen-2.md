# screen-2
source: design/contact.png
viewport: 1920x1080 @scale 1
background: #010101 (probe 40,200 80x80). Faint point wave on the right. Footer band #353738 (probe 960,1040 40x20).

| id | element | text (verbatim) | x,y,w,h | size/weight/case/tracking | colour (probe) | notes |
|---|---|---|---|---|---|---|
| logo | mark | (none) | 390,52 141x24 | bars h 24 | #eaeaea | same mark as screen 1, 10px higher |
| icon-in | icon | (none) | 566,52 23x22 |  | #eaeaea | group 566,52 119x24 |
| icon-gh | icon | (none) | 611,52 24x22 |  | #eaeaea | |
| icon-mail | icon | (none) | 657,52 28x22 |  | #eaeaea | |
| nav-projects | link | Projects | 1137,50 87x23 | ink h 23 / title case | #eaeaea | |
| nav-research | link | Research | 1282,51 100x17 | ink h 17 | #eaeaea | |
| nav-contact | link | Contact | 1439,50 86x18 | ink h 18 | #eaeaea | |
| title | text | Get In Touch | 580,182 478x63 | ink h 63 / title case | #eaeaea peak 594,190 | |
| subtitle | text | Open To Collaborate On Tech & Research Projects | 559,260 544x23 | ink h 23 / title case | #a8a8a8 peak 794,262 | |
| row-mail | link | desansilva0@gmail.com | 299,441 421x32 | ink h 32 | #ffffff mode | mail icon at left of the row |
| row-gh | link | https://github.com/desansilva | 299,521 692x38 | ink h ~32 | #ffffff | GitHub icon |
| row-in | link | https://www.linkedin.com/in/desansilva/ | 299,562 701x88 | ink h ~32 | #ffffff | box is tall; glyph band is one line. LinkedIn icon |
| row-loc | text | Colombo, Sri Lanka | 295,670 345x43 | ink h ~22 | #ffffff | pin icon. Not an obvious link |
| row-tel | text | +94 70 283 5523 | 304,751 291x37 | ink h ~22 | #ffffff | phone icon |
| label-name | text | Your Name | 1072,392 120x10 | ink h ~10 | #4b4c4c (probe 1200,411 is the stroke) | sits on the field top |
| field-name | input | (empty) | 1049,411 566x80 | radius pill | stroke #4d4e4e ; fill #0e0e0f | bottom edge is the next stroke, ±10px (dots cross it) |
| label-email | text | Your E-Mail | 1072,495 92x10 | ink h ~10 | #4b4c4c | |
| field-email | input | (empty) | 1021,514 620x87 | radius pill | stroke #4d4e4e ; fill #000000 | |
| label-msg | text | Message | 1072,593 80x10 | ink h ~10 | #4b4c4c | |
| field-msg | textarea | (empty) | 1040,622 575x220 | radius ~16 | stroke #4d4e4e ; fill #000000 | bottom near y 841 |
| send | icon | (none) | 1552,800 32x32 |  | #eaeaea | paper plane, inside the message field, bottom right |
| footer | text | All Rights Reserved © Desan Silva 2026 | 652,1033 448x17 | ink h 17 | #eaeaea peak 658,1033 | on the #353738 band (y 990–1080) |

interactive: header icons and nav as screen 1. row-mail -> mailto:desansilva0@gmail.com ; row-gh -> https://github.com/desansilva ; row-in -> https://www.linkedin.com/in/desansilva/ . row-loc and row-tel have no visible href. Form has no action, no button label; send is an icon only.
decorative: point wave, right side; footer band.
assets to draw as inline SVG: logo, header icons, row icons (mail, GitHub, LinkedIn, pin, phone), paper plane.
uncertain: field bottoms where dots cross the stroke; form action; whether phone and location are links; font. See A-4, A-6, A-7.
