# Tubie-Man

A Pac-Man-inspired arcade game built with Phaser 3, Vite, React, and TypeScript. Eat all the pellets, avoid the enemies, and breathe fireballs to fight back.

## Tech Stack

- **[Phaser 3](https://phaser.io/)** — game engine
- **[React 19](https://react.dev/)** — UI shell
- **[Vite](https://vitejs.dev/)** — build tool and dev server
- **TypeScript** — throughout

## Project Structure

```
phaser-vite-react-game/
├── public/
│   └── assets/
│       ├── audio/          # Music and sound effects (.mp3 / .ogg)
│       ├── fonts/          # PressStart2P bitmap font
│       └── sprites/        # Texture atlas (atlas.png / atlas.json)
├── src/
│   ├── components/         # React components (game canvas wrapper)
│   ├── config/             # Game config, color palettes, localization
│   ├── entities/           # Player, enemies (Doc, Pricky, Pokey, Stingy), projectiles, bonuses
│   ├── enums/              # Shared enums (Direction, Language, MapValue, …)
│   ├── interfaces/         # TypeScript interfaces
│   ├── managers/           # Audio, collision, entity, input, level, state managers
│   ├── resources/maps/     # Pre-generated map JSON files
│   ├── scenes/             # Phaser scenes (Boot, Preload, Game, Menu, …)
│   ├── ui/                 # HUD renderer, menus, scrollable text, touch controls
│   └── utils/              # Map generator, pathfinder, audio, high scores, dev tools
├── terraform/              # AWS infrastructure (S3 + CloudFront + ACM + Route 53)
└── .github/workflows/      # CI/CD — build and deploy to AWS on push to main
```

## Getting Started

**Install dependencies:**

```bash
npm install
```

**Run the development server:**

```bash
npm run dev
```

Then open `http://localhost:5173` in your browser.

**Generate map files** (pre-bakes maps used in-game):

```bash
npm run generate:maps
```

## Building for Production

```bash
npm run build
```

Output goes to `dist/`. The Vite build hashes all asset filenames for cache-busting except `index.html`.

## Deployment

The game is hosted at [tubieman.tubietech.com](https://tubieman.tubietech.com) via AWS S3 + CloudFront.

### First-time infrastructure setup (Terraform)

Terraform state is stored in the shared `tubie-tech-terraform-state` S3 bucket.

**Step 1 — Create the ACM certificate:**

```bash
cd terraform
terraform init
terraform apply -target=aws_acm_certificate.tubieman
```

Read the validation CNAME outputs and add them to the `tubietech.com` Route 53 hosted zone manually:

```bash
terraform output acm_validation_cname_name
terraform output acm_validation_cname_value
```

**Step 2 — Deploy everything once the certificate is validated:**

```bash
terraform apply
```

### Deploying a new build manually

```bash
npm run build
aws s3 sync dist/ s3://tubie-tech-tubieman --delete
aws cloudfront create-invalidation \
  --distribution-id $(terraform -chdir=terraform output -raw cloudfront_distribution_id) \
  --paths "/*"
```

### CI/CD

Pushing to `main` triggers the [deploy workflow](.github/workflows/deploy.yml), which:

1. Installs dependencies and runs `npm run build`
2. Assumes an IAM role via OIDC (no stored AWS keys)
3. Syncs `dist/` to S3 with correct cache headers
4. Invalidates the CloudFront distribution

#### Required GitHub configuration

| Type     | Name                          | Value                                                |
| -------- | ----------------------------- | ---------------------------------------------------- |
| Secret   | `AWS_ROLE_ARN`                | ARN of the IAM role to assume                        |
| Variable | `S3_BUCKET_NAME`              | `tubie-tech-tubieman`                                |
| Variable | `CLOUDFRONT_DISTRIBUTION_ID`  | from `terraform output cloudfront_distribution_id`   |

The IAM role trust policy must allow `sts:AssumeRoleWithWebIdentity` from `token.actions.githubusercontent.com` scoped to `refs/heads/main`. The role needs `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket` on the bucket and `cloudfront:CreateInvalidation` on the distribution.

## License

This project is licensed under the MIT License.
