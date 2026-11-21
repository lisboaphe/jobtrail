# Jobtrail

Jobtrail keeps track of your job applications: where you sent each CV and what happened next.

- **Board:** every application sits in a colored column: Saved, Applied, Interview, Offer or Rejected. When a company replies, drag the card to the right column.
- **CVs:** each version of your CV (CV1, CV2, …) gets its own colored folders, so you can see at a glance that *CV1 went to Company1 and was rejected*.
- **Follow-up reminders:** if a company hasn't replied after 7 days (you can change this), Jobtrail reminds you to follow up.
- **Timeline:** every application keeps its history: *Applied 5 Nov → Followed up → Interview 12 Nov*.
- **Insights:** reply rate, interview rate, applications per week, and which CV works best.
- **Light and dark mode.**

**Try the demo:** <https://lisboaphe.github.io/jobtrail/>

The demo runs entirely in your browser with sample data. Anything you change is saved only on your own device, and **Reset demo** brings the sample data back.

## Running it

You need [Node.js](https://nodejs.org) version 24 or newer.

```bash
npm install      # first time only: downloads the libraries the app uses
npm run dev      # starts the app
```

Then open <http://localhost:3000>.

Your data is saved in the `data/` folder on your computer. It is not uploaded anywhere, and it is not included in git.

## How the project is organized

```
src/
├── app/                      Pages and web addresses
│   ├── page.tsx              The home page: loads your data and shows the app
│   ├── page.demo.tsx         The home page of the online demo
│   ├── layout.tsx            The frame around every page (fonts, title, dark mode)
│   ├── globals.css           Colors, fonts, buttons and inputs
│   └── api/cv/[id]/route.ts  Lets you open an uploaded CV file
│
├── components/               What you see on screen
│   ├── JobtrailApp.tsx       The main screen: navigation, heading, reminders
│   ├── actions-context.tsx   The list of save functions the screens use
│   ├── board/                The five colored columns
│   ├── cv-library/           Your CVs and their colored folders
│   ├── insights/             Charts and numbers
│   ├── application/          The side panel to add or edit an application
│   └── ui/                   Small shared pieces (the Light/Dark switch)
│
├── server/                   Runs only on the server, never in the browser
│   ├── database.ts           Creates the database and its tables
│   ├── queries.ts            Reads data
│   └── actions.ts            Saves data (add, edit, move, delete, upload)
│
├── demo/                     The online demo (GitHub Pages)
│   ├── DemoApp.tsx           The demo page with its "this is a demo" bar
│   └── demo-store.ts         Sample data, saved in the visitor's browser
│
└── lib/                      Shared definitions and helpers
    ├── statuses.ts           The five stages and their colors
    ├── types.ts              What a CV / application / event looks like
    └── calculations.ts       Days ago, follow-ups, reply and interview rates

data/                         Your database and uploaded CVs (created automatically)
```

Every file starts with a short comment explaining what it does.

### The online demo

GitHub Pages can only host plain files and can't run a server or a database. So the demo is a separate build of the same screens. They save to the visitor's browser (`src/demo/demo-store.ts`) instead of to the server.

```bash
npm run build:demo   # builds the demo into out/
```

Every push to `main` rebuilds the demo and publishes it automatically (`.github/workflows/pages.yml`).

## How it works

1. You open the page. The server reads your applications and CVs from the database (`server/queries.ts`) and sends them to the browser.
2. You click, drag or fill in a form. The browser calls a function in `server/actions.ts`, which checks the input and saves it to the database.
3. The page refreshes itself with the new data. When you drag a card, it moves straight away, before the server has even answered, so the app feels instant.

### The data

| Table          | What it holds                                                                 |
| -------------- | ----------------------------------------------------------------------------- |
| `cvs`          | Each CV version: name, a note about what's different, and the uploaded file   |
| `applications` | Each job: company, role, status, which CV was sent, date, link, contact, notes |
| `events`       | The timeline of each application: status changes and notes, with dates      |

## Built with

- [Next.js](https://nextjs.org) and [React](https://react.dev): the web framework
- [Tailwind CSS](https://tailwindcss.com): styling
- [SQLite](https://sqlite.org), built into Node.js: the database
- [TypeScript](https://www.typescriptlang.org): JavaScript with type checking
- Fonts: Mona Sans and Geist Mono
