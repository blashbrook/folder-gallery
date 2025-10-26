## [1.10.4](https://github.com/blashbrook/folder-gallery/compare/v1.10.3...v1.10.4) (2025-10-26)


### Bug Fixes

* **server:** make image route compatible with path-to-regexp v8 and serve index.html from scanDir\n\n- Change /image route to regex to avoid path-to-regexp errors\n- Serve index.html via express.static at root; remove explicit app.get('/')\n- Use scanDir for .gallery-cache paths instead of process.cwd()\n- Log generated index.html absolute path for debugging ([c934cb9](https://github.com/blashbrook/folder-gallery/commit/c934cb90590fdd96d5ba71ba390a45b8e85d0c69))

## [1.10.3](https://github.com/blashbrook/folder-gallery/compare/v1.10.2...v1.10.3) (2025-10-26)


### Bug Fixes

* address test failures ([31aa9e8](https://github.com/blashbrook/folder-gallery/commit/31aa9e8f4a068119ceaf513f25c8a984f6022db2))

## [1.10.2](https://github.com/blashbrook/folder-gallery/compare/v1.10.1...v1.10.2) (2025-10-26)


### Bug Fixes

* address test failures ([5679fd2](https://github.com/blashbrook/folder-gallery/commit/5679fd2737cc287eb9154295a34be92935c56405))
* update server runner ([e3e97bb](https://github.com/blashbrook/folder-gallery/commit/e3e97bb6a522c693d4685debce75916ba9d53bd5))

## [1.10.1](https://github.com/blashbrook/folder-gallery/compare/v1.10.0...v1.10.1) (2025-10-26)


### Bug Fixes

* remove backup files ([bc26c60](https://github.com/blashbrook/folder-gallery/commit/bc26c609b969cea1027293a56119c5ee6ed0e19c))
* update README.md to reflect changes ([9f38cf2](https://github.com/blashbrook/folder-gallery/commit/9f38cf23b69d7f9dcee9e525dc2d198d2fb75082))

# [1.10.0](https://github.com/blashbrook/folder-gallery/compare/v1.9.0...v1.10.0) (2025-10-26)


### Features

* modify the actual size icon ([5dab518](https://github.com/blashbrook/folder-gallery/commit/5dab5185ae25cb19a97e83a47a8b40b1e4b5136a))

# [1.9.0](https://github.com/blashbrook/folder-gallery/compare/v1.8.0...v1.9.0) (2025-10-26)


### Features

* add info button and tooltip ([1346c95](https://github.com/blashbrook/folder-gallery/commit/1346c95d3c3a2c0e53547aead90ce7e8edb59303))

# [1.8.0](https://github.com/blashbrook/folder-gallery/compare/v1.7.2...v1.8.0) (2025-10-26)


### Features

* updated documentation ([0603c89](https://github.com/blashbrook/folder-gallery/commit/0603c89c948366172153557c5fbf3ee12159a348))

## [1.7.2](https://github.com/blashbrook/folder-gallery/compare/v1.7.1...v1.7.2) (2025-10-26)


### Bug Fixes

* add instant update for tag filter ([5665681](https://github.com/blashbrook/folder-gallery/commit/5665681f06349aaf15c1913baaab809d44dffebd))
* fix tests ([228138f](https://github.com/blashbrook/folder-gallery/commit/228138fb3f018fcf0a0dbe7a75dfce678c736c4e))

## [1.7.1](https://github.com/blashbrook/folder-gallery/compare/v1.7.0...v1.7.1) (2025-10-26)


### Bug Fixes

* include macos-tags.js in npm package ([a786d5c](https://github.com/blashbrook/folder-gallery/commit/a786d5cf887b8e57f7b367f1b154946011b87c3f))

# [1.7.0](https://github.com/blashbrook/folder-gallery/compare/v1.6.3...v1.7.0) (2025-10-26)


### Features

* add backgound server tests ([1a63ac9](https://github.com/blashbrook/folder-gallery/commit/1a63ac98ae976ba0c2bd0281d0dd4594cf014f68))

## [1.6.3](https://github.com/blashbrook/folder-gallery/compare/v1.6.2...v1.6.3) (2025-10-26)


### Bug Fixes

* update npm package ([8368e83](https://github.com/blashbrook/folder-gallery/commit/8368e835c4942915cb9da63ca97bdbbcad847cc8))

## [1.6.2](https://github.com/blashbrook/folder-gallery/compare/v1.6.1...v1.6.2) (2025-10-26)


### Bug Fixes

* update server runner ([5a38229](https://github.com/blashbrook/folder-gallery/commit/5a38229991e47373cea10e2c18b8734654171742))

## [1.6.1](https://github.com/blashbrook/folder-gallery/compare/v1.6.0...v1.6.1) (2025-10-26)


### Bug Fixes

* semantic-release failures ([1972167](https://github.com/blashbrook/folder-gallery/commit/19721674a53517a60f9d12318c7aac63b14a752a))

# [1.6.0](https://github.com/blashbrook/folder-gallery/compare/v1.5.1...v1.6.0) (2025-10-26)


### Features

* add gallery list function to show all running galleries ([68eda01](https://github.com/blashbrook/folder-gallery/commit/68eda010258cd41297271854fd1d7357593ae35c))

## [1.5.1](https://github.com/blashbrook/folder-gallery/compare/v1.5.0...v1.5.1) (2025-10-26)


### Bug Fixes

* address test failures ([199cd5e](https://github.com/blashbrook/folder-gallery/commit/199cd5e86fbe89398b86dca68e0f809cd2a0819e))

# [1.5.0](https://github.com/blashbrook/folder-gallery/compare/v1.4.2...v1.5.0) (2025-10-26)


### Bug Fixes

* fix gallery launch ([e5bb283](https://github.com/blashbrook/folder-gallery/commit/e5bb283e88536da5a63d59afadde752782e8fb48))


### Features

* add tag highlighting in modal view ([7885e31](https://github.com/blashbrook/folder-gallery/commit/7885e313361060f430917cf27ad082cc2f717d31))
* add test for tag features ([1fc434f](https://github.com/blashbrook/folder-gallery/commit/1fc434fd605ad9f55cabbfb1493f18dd52545b75))

## [1.4.2](https://github.com/blashbrook/folder-gallery/compare/v1.4.1...v1.4.2) (2025-10-26)


### Bug Fixes

* add tags ([d29cf37](https://github.com/blashbrook/folder-gallery/commit/d29cf37dd892d9f224a7a1d2e06fb38789eab8fb))
* address test failures ([0790d21](https://github.com/blashbrook/folder-gallery/commit/0790d218b91e17c31acfbee0eb448bd52ad296c7))
* fix tag reading and deleting ([0c5c123](https://github.com/blashbrook/folder-gallery/commit/0c5c123566389ece0375b7f091c51338bfcefa8b))
* update server runner ([9c58a73](https://github.com/blashbrook/folder-gallery/commit/9c58a73fc17360ffb712d905be862e383313ff1a))

## [1.4.1](https://github.com/blashbrook/folder-gallery/compare/v1.4.0...v1.4.1) (2025-10-26)


### Bug Fixes

* update server runner ([8ddce6d](https://github.com/blashbrook/folder-gallery/commit/8ddce6d427726b2843944e6b9962eeef72920693))

# [1.4.0](https://github.com/blashbrook/folder-gallery/compare/v1.3.2...v1.4.0) (2025-10-26)


### Bug Fixes

* add tag icon to the header ([74f5ebd](https://github.com/blashbrook/folder-gallery/commit/74f5ebd92de13af6d3222ca40e0aebc461ee5340))
* address test failures ([6bf7da9](https://github.com/blashbrook/folder-gallery/commit/6bf7da97ac2fc9daa7bc58cb09b4732858c3c5ab))


### Features

* add tests ([fcd7f86](https://github.com/blashbrook/folder-gallery/commit/fcd7f8683f55f700902f5101e8421e7e6be30965))

## [1.3.2](https://github.com/blashbrook/folder-gallery/compare/v1.3.1...v1.3.2) (2025-10-26)


### Bug Fixes

* update release workflow ([ac72841](https://github.com/blashbrook/folder-gallery/commit/ac72841e5ef0a6f1a782e1447684db9b5fac7afa))

## [1.3.1](https://github.com/blashbrook/folder-gallery/compare/v1.3.0...v1.3.1) (2025-10-26)


### Bug Fixes

* fix thumbnail display ([b646d06](https://github.com/blashbrook/folder-gallery/commit/b646d062147aef404195a71d0eec6f035c5c1fb5))

# [1.3.0](https://github.com/blashbrook/folder-gallery/compare/v1.2.0...v1.3.0) (2025-10-26)


### Features

* add tagging ([db92c71](https://github.com/blashbrook/folder-gallery/commit/db92c71dbf840613fab7e17f54cd12345e640380))

# [1.2.0](https://github.com/blashbrook/folder-gallery/compare/v1.1.1...v1.2.0) (2025-10-26)


### Features

* add navigation to zoom controls ([882c526](https://github.com/blashbrook/folder-gallery/commit/882c5260141baaeb47afec93db5cb7b278611dd3))

## [1.1.1](https://github.com/blashbrook/folder-gallery/compare/v1.1.0...v1.1.1) (2025-10-26)


### Bug Fixes

* update to multer 2.x ([7819f22](https://github.com/blashbrook/folder-gallery/commit/7819f225003f6c31ff84cf4d4901a5d4615e1d0a))

# [1.1.0](https://github.com/blashbrook/folder-gallery/compare/v1.0.1...v1.1.0) (2025-10-26)


### Features

* publish to npm ([a6830e6](https://github.com/blashbrook/folder-gallery/commit/a6830e643ca1e91c639e34661866db926df00076))

## [1.0.1](https://github.com/blashbrook/folder-gallery/compare/v1.0.0...v1.0.1) (2025-10-25)


### Bug Fixes

* update npm ([4903daa](https://github.com/blashbrook/folder-gallery/commit/4903daab563d191c4dcd43625bd37e5fa5a82b02))

# 1.0.0 (2025-10-25)


### Bug Fixes

* add shell detection and windows compatibility ([642f1ad](https://github.com/blashbrook/folder-gallery/commit/642f1ada6e5881fa5e63f0a67c17574d39a13dd2))
* fix terminal release when using gallery delete ([21fd1b1](https://github.com/blashbrook/folder-gallery/commit/21fd1b1f2fd98eedbd7aa4f6e1e96ccc73c2035d))
* make gallery portable ([fccfa58](https://github.com/blashbrook/folder-gallery/commit/fccfa581633432a3b8b7f97f4f7d0135a87c3222))
* replace icons with minimal svg icons ([bcd69c8](https://github.com/blashbrook/folder-gallery/commit/bcd69c8efeaebde5154dd7dd744932e220142591))
* thumbmail generation pausing ([da615df](https://github.com/blashbrook/folder-gallery/commit/da615df9b0656750e1bed0d52005013174eae034))
* thumbnail generation ([8a7d2e0](https://github.com/blashbrook/folder-gallery/commit/8a7d2e079603849b43e7ce166a3cfc6fd6ef2c2d))
* thumbnail generation ([ed7618d](https://github.com/blashbrook/folder-gallery/commit/ed7618db4fb823fcc3a349c9eb0a7eae9517c40f))
* thumbnail generation ([8494ec4](https://github.com/blashbrook/folder-gallery/commit/8494ec44a1936edc35bc77b9d361958f63a2f4ef))
* update local-install.sh ([da5ca70](https://github.com/blashbrook/folder-gallery/commit/da5ca701888d0cb0f0f530de62affb4b495260f6))
* update npm ([69f8804](https://github.com/blashbrook/folder-gallery/commit/69f88045e59df79555dd63560a83d5fc4edf016b))
* ux improvements ([686068f](https://github.com/blashbrook/folder-gallery/commit/686068f09d8aa8c36b75482aa0858eb9e821b552))


### Features

* add favorite feature ([2ac0665](https://github.com/blashbrook/folder-gallery/commit/2ac06658ef29cccfe276bd25afd610dc23e5cd02))
* add function to pause gallery scanning ([d64057a](https://github.com/blashbrook/folder-gallery/commit/d64057a156fc915f5e77acc3353a6cbbf8983c27))
* add lazying loading for large galleries ([578d009](https://github.com/blashbrook/folder-gallery/commit/578d009cd756786c3cfc0b3df215ec1eee327279))
* add low res thumbnails and fix terminal release ([2a2b9ee](https://github.com/blashbrook/folder-gallery/commit/2a2b9eeb36912eb22190bc68964d7979f864e738))
* add progress bar to header and change buttons to icons only ([577c4c6](https://github.com/blashbrook/folder-gallery/commit/577c4c6fbbbd9b71e429f22a8ac50782aa26a648))
* add progressive loading and visual feedback ([f7b9782](https://github.com/blashbrook/folder-gallery/commit/f7b9782f4426b660390e77db83a6c84ac59e57fe))
* add video thumbnail generation ([aa6ec90](https://github.com/blashbrook/folder-gallery/commit/aa6ec90be3e6a2142081cb35fdc3daf4487783f3))
