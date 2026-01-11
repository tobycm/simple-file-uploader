<!-- <img src="https://raw.githubusercontent.com/tobycm/mea/refs/heads/main/assets/mea%20bot%20banner.png" alt="Banner"> -->

# simple file uploader

a simple frontend and backend to help you utilize some of your storage space on your server to store and share files.

Demo: [https://file.tobycm.dev](https://file.tobycm.dev)

## Table of Contents

- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Features & Commands](#features--commands)
- [Contributing](#contributing)
- [License](#license)

## Requirements

- [Bun](https://bun.sh/)
- Storage

## Getting started

### Installation & Setup

Install dependencies:

```bash
bun i
```

Setting up the environment variables:

```bash
cp .env.example .env

$EDITOR .env
```

Run the backend:

```bash
cd server && bun run start
```

## Features

### File Upload

⬆️ Upload files to your server via the frontend.

`/upload` endpoint accepts `POST` requests with `multipart/form-data` containing the file to be uploaded.

### Transcoding

⚙️ Transcode uploaded media files to friendly format for web previewing using FFmpeg.

Option toggle in `/upload` endpoint to enable/disable transcoding per upload.

### Folders

📁 Upload to folder

## Contributing

You are welcome to contribute by submitting issues or pull requests!

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
