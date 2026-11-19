# screen-3
source: design/landing_page.png
viewport: 1920x1080 @scale 1
background: #020303 (probe 40,200 80x80 and 960,200 40x40). Upper right #070809 (probe 1600,200 80x80). Lower wash #282c2c (probe 200,900 80x80) and #262829 (probe 1700,900 60x60). Point grid is white, dense top-right, sparse and faded toward the left under the headline.

| id | element | text (verbatim) | x,y,w,h | size/weight/case/tracking | colour (probe) | notes |
|---|---|---|---|---|---|---|
| logo | mark | (none) | 390,61 141x24 | bars h 24 | #eaeaea peak 390,61 | |
| icon-in | icon | (none) | 566,62 23x22 |  | #eaeaea | |
| icon-gh | icon | (none) | 611,62 24x22 |  | #eaeaea | |
| icon-mail | icon | (none) | 657,62 28x22 |  | #eaeaea | |
| nav-projects | link | Projects | 1137,60 87x22 | ink h 22 / title case | #eaeaea peak 1138,60 | |
| nav-research | link | Research | 1282,60 100x17 | ink h 17 | #eaeaea | |
| nav-contact | link | Contact | 1439,59 86x18 | ink h 18 | #eaeaea | |
| kicker | text | Portfolio | 104,652 146x28 | ink h 28 / title case | #eaeaea peak 104,653 | |
| name | text | Desan Silva | 104,680 975x150 | ink h ~140 / title case / tracking not measured | #eaeaea peak 104,700 | left word 104,680 560x150; right word 718,692 361x138 |
| rule | line | (none) | 99,860 1211x1 | 1px | #ffffff probe 200,860 8x1 | hairline under the name |
| role | text | AI/ML Engineer & Researcher | 99,891 513x40 | ink h 40 | #eaeaea peak 149,891 | |
| cta-resume | link | View Resume | 1239,926 232x44 | ink h ~18 | stroke #eaeaea ; fill #1d2021 (probe 1280,948) | outline button |
| cta-touch | link | Get In Touch → | 1460,926 244x44 | ink h ~18 | fill #eaeaea ; label #050505 | filled button. Arrow is a separate SVG |

interactive: header as screen 1. cta-resume -> /docs/resume.pdf (href not drawn; see A-3). cta-touch -> #contact (target not drawn; see A-4).
decorative: point grid (hero). Left side stays dark so the name stays readable.
assets to draw as inline SVG: logo, three header icons, arrow on cta-touch.
uncertain: font; button hrefs; this file sorts last, so it is screen 3, while the 3D notes call the hero screen 1. See A-1.
