# Cryptocurrency Prediction Dashboard

![Next.js](https://img.shields.io/badge/Next.js-15.1.2-black.svg)
![React](https://img.shields.io/badge/React-19.0.0-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0.0-black.svg)
![License](https://img.shields.io/badge/License-MIT-black.svg)

Real-time cryptocurrency price prediction interface with model training visualization and WebSocket integration.

## Features

- Real-time price prediction charts
- Model training progress monitoring
- Historical performance analysis
- WebSocket-based training updates
- Responsive mobile-first design
- Dark/Light theme support

## Technologies Used

- **Framework**: Next.js 15 (App Router)
- **Visualization**: Recharts
- **Styling**: Tailwind CSS + CSS Modules
- **API Client**: Axios
- **WebSocket**: Socket.IO Client
- **Form Handling**: React Hook Form
- **Utilities**: date-fns, lodash
- **Type Checking**: TypeScript 5
- **Linting**: ESLint + Prettier

## Getting Started

### Prerequisites

- Node.js 18.x+
- npm 9.x+
- Running ML Server (see [server README](../server/README.md))

### Installation

```bash
git clone https://github.com/your-repo/crypto-prediction.git
cd client
npm install
```

### Environment Setup

Create `.env.local` file:

```env
NEXT_PUBLIC_BASE_URL=http://localhost:5000
NEXT_PUBLIC_CRYPTO_DATA_API=
NEXT_PUBLIC_TRADING_VIEW_URL=
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
client/
├── app/
│   ├── dashboard/
│   │   └── page.tsx       # Main dashboard
│   ├── layout.tsx         # Root layout
│   └── not-found.tsx     # 404 page
├── components/
│   ├── charts/           # Recharts components
│   ├── training/         # Progress indicators
│   └── widgets/          # Dashboard main widgets
│   └── ui/               # Shadcn/ui components

├── lib/
│   ├── api.ts            # Axios client
│   └── websocket.ts      # Socket.IO client
├── styles/
│   ├── globals.css       # Tailwind imports
│   └── variables.module.css # CSS variables
└── types/
    └── api.ts            # TypeScript interfaces
```

## Environment Variables

| Variable Name                  | Description                  | Required |
| ------------------------------ | ---------------------------- | -------- |
| `NEXT_PUBLIC_BASE_URL`         | ML Server API base URL       | Yes      |
| `NEXT_PUBLIC_CRYPTO_URL`       | Historical crypto data API   | No       |
| `NEXT_PUBLIC_TRADING_VIEW_URL` | Trading view widget endpoint | No       |
