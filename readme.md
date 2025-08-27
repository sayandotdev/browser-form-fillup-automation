# Browser Automation Form Fillup

A Node.js-based project that automates form filling in web browsers using AI-powered suggestions. This project leverages the power of Playwright for browser automation and OpenAI/Google GenAI for intelligent input generation.

## Tech Stack

- **Node.js**
- **Package Manager:** pnpm

## Libraries & Packages

- **[Playwright](https://playwright.dev/)** – For automating browser actions.
- **[OpenAI](https://www.npmjs.com/package/openai)** – For AI-based input generation.
- **[Google GenAI](https://developers.google.com/)** – For additional AI suggestions and intelligent input.

## Features

- Automates filling of forms in web applications.
- Uses AI to intelligently generate input for various fields.
- Fully configurable to work with different websites and form types.
- Easy to set up and extend for custom workflows.

## Installation

1. Clone the repository:

   ```bash
   git clone <your-repo-url>
   cd <your-repo-folder>
   ```

2. Install dependencies using pnpm:

   ```bash
   pnpm install
   ```

3. Set up environment variables (API keys for OpenAI/Google GenAI, if required).

## Usage

```bash
pnpm start
```

## Output Demo

<video src="./public/video-demo.mp4" controls></video>

- Configure the target website and form fields in the configuration file.
- Run the script to automatically fill the form using AI-generated input.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests to improve functionality, add new features, or enhance documentation.

## License

This project is licensed under the MIT License.
