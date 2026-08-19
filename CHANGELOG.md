# Changelog

## [0.15.0](https://github.com/Selftend/selftend/compare/v0.14.1...v0.15.0) (2026-08-19)


### Features

* **android:** offer the update Play is actually serving ([#388](https://github.com/Selftend/selftend/issues/388)) ([#1070](https://github.com/Selftend/selftend/issues/1070)) ([6965a81](https://github.com/Selftend/selftend/commit/6965a817ff4497e5287d36421f60c2064c592167))
* **notifications:** the module-home bell opens the Reminders screen ([#1071](https://github.com/Selftend/selftend/issues/1071)) ([#1073](https://github.com/Selftend/selftend/issues/1073)) ([8d7d704](https://github.com/Selftend/selftend/commit/8d7d70498ed0a006dd41fe6357eb991152e9a62f))


### Bug Fixes

* a dismissed modal on web unmounts instead of lingering as a focus trap ([#1054](https://github.com/Selftend/selftend/issues/1054)) ([#1075](https://github.com/Selftend/selftend/issues/1075)) ([e2d28a4](https://github.com/Selftend/selftend/commit/e2d28a437ee684014330dd5e519a750c06931995))
* error toasts speak the user's language, and say each sentence once ([#1064](https://github.com/Selftend/selftend/issues/1064), [#1060](https://github.com/Selftend/selftend/issues/1060)) ([#1074](https://github.com/Selftend/selftend/issues/1074)) ([b3be6e4](https://github.com/Selftend/selftend/commit/b3be6e41746317e78b5fd8be0cab053c1aeb5b92))

## [0.14.1](https://github.com/Selftend/selftend/compare/v0.14.0...v0.14.1) (2026-08-16)


### Bug Fixes

* **a11y:** stop a lone row offering two rotor moves that refuse ([#1049](https://github.com/Selftend/selftend/issues/1049)) ([#1050](https://github.com/Selftend/selftend/issues/1050)) ([2b67a93](https://github.com/Selftend/selftend/commit/2b67a931ec870e695a3f6381a21110033924154b))
* **auth:** stop the header menu swallowing a failed sign-out ([#1053](https://github.com/Selftend/selftend/issues/1053)) ([#1057](https://github.com/Selftend/selftend/issues/1057)) ([7a4c078](https://github.com/Selftend/selftend/commit/7a4c078194e73a2a1d5b2306171f02f530446cf1))
* **cbt:** a field that needs fixing no longer reads as data loss ([#1045](https://github.com/Selftend/selftend/issues/1045)) ([9406d2d](https://github.com/Selftend/selftend/commit/9406d2d50fefb58b144fd4b542e0f04b13fdce02))
* **home:** heal duplicate widget positions instead of leaving them permanent ([#986](https://github.com/Selftend/selftend/issues/986)) ([#1043](https://github.com/Selftend/selftend/issues/1043)) ([ab5acae](https://github.com/Selftend/selftend/commit/ab5acae5caeeefa3d0f6aa8d2b2c7429d0fc7024))
* **home:** tell the arrange handle's hint reader something it can act on ([#1047](https://github.com/Selftend/selftend/issues/1047)) ([#1048](https://github.com/Selftend/selftend/issues/1048)) ([7f8a5ff](https://github.com/Selftend/selftend/commit/7f8a5fff83acea520a91781bd8a7f90f1dea0fba))
* **i18n:** say what actually failed when sign-out fails ([#1055](https://github.com/Selftend/selftend/issues/1055)) ([#1058](https://github.com/Selftend/selftend/issues/1058)) ([c280e00](https://github.com/Selftend/selftend/commit/c280e008c7743bf19531752f74d98a7967a7740a))
* **mood:** give the emotion list a reorder path that is not a drag ([#965](https://github.com/Selftend/selftend/issues/965)) ([#1046](https://github.com/Selftend/selftend/issues/1046)) ([dc01fe3](https://github.com/Selftend/selftend/commit/dc01fe366bd2bb14cb4078a969e0f79086f80dfb))
* unmount dismissed dialogs on web, and scope sign-out to this device ([#1034](https://github.com/Selftend/selftend/issues/1034), [#968](https://github.com/Selftend/selftend/issues/968)) ([#1052](https://github.com/Selftend/selftend/issues/1052)) ([a5a698d](https://github.com/Selftend/selftend/commit/a5a698d20d6213254cfdbb12c1db62cd8a7d23f5))

## [0.14.0](https://github.com/Selftend/selftend/compare/v0.13.0...v0.14.0) (2026-08-14)


### Features

* **cbt:** the condition table says what it is ([#1011](https://github.com/Selftend/selftend/issues/1011)) ([#1022](https://github.com/Selftend/selftend/issues/1022)) ([aa50ae7](https://github.com/Selftend/selftend/commit/aa50ae7ba63fe09b261ea4c3a2038af986a6faea))
* **home:** arrange becomes a route, and AddWidgetModal dies ([#980](https://github.com/Selftend/selftend/issues/980)) ([#1018](https://github.com/Selftend/selftend/issues/1018)) ([706b99b](https://github.com/Selftend/selftend/commit/706b99bbeb1fd3d16794787566e3a6ccd22867d4))
* **home:** collapse the three legacy widget ids and bump snapshot schemaVersion to 4 ([#984](https://github.com/Selftend/selftend/issues/984)) ([381ad0e](https://github.com/Selftend/selftend/commit/381ad0e6f0e4437ac1ad7e8b342e20ca9213516e))
* **home:** server-owned widget positions via add_widget_preference and set_widget_order ([#985](https://github.com/Selftend/selftend/issues/985)) ([0ddbf9f](https://github.com/Selftend/selftend/commit/0ddbf9fa6c96cdfc3cbe48c7b25be222190d1dbc)), closes [#974](https://github.com/Selftend/selftend/issues/974)
* **home:** the fourteen module and shortcut rows ([#992](https://github.com/Selftend/selftend/issues/992)) ([c1a8a0c](https://github.com/Selftend/selftend/commit/c1a8a0cb84918b16bc8a2f7e103203c880234c59))
* **home:** the greeting, two header actions, and the empty state ([#979](https://github.com/Selftend/selftend/issues/979)) ([#997](https://github.com/Selftend/selftend/issues/997)) ([636580e](https://github.com/Selftend/selftend/commit/636580e60e80403fc44ce49abf17dd68a4917b74))
* **home:** the Guided programmes tier - honest ordinal badge, no bar ([#993](https://github.com/Selftend/selftend/issues/993)) ([4474916](https://github.com/Selftend/selftend/commit/447491673e0b170239bc37e6b70b26e0407084bd))
* **home:** the Right now tier - mood card and two derived nudges ([#994](https://github.com/Selftend/selftend/issues/994)) ([12ae145](https://github.com/Selftend/selftend/commit/12ae1458518d7f5129493e1a9d89d123cdca4550))
* **home:** the Your tools tier becomes rows, with nine tool stats ([#988](https://github.com/Selftend/selftend/issues/988)) ([e1a620f](https://github.com/Selftend/selftend/commit/e1a620f468a1a7bdefd18062b782eef0935aca9e))
* **home:** WidgetMeta gains route and tier, making the registry the dashboard catalogue ([#983](https://github.com/Selftend/selftend/issues/983)) ([759e6be](https://github.com/Selftend/selftend/commit/759e6bede57480f04b772c0796ca8b2913c59395))
* **reminders:** one control, two paths ([#981](https://github.com/Selftend/selftend/issues/981)) ([#1012](https://github.com/Selftend/selftend/issues/1012)) ([b8910db](https://github.com/Selftend/selftend/commit/b8910dbbeb94efdb8560556fab998af7a8f978b1))
* **settings:** seven cards flatten into four labelled runs ([#982](https://github.com/Selftend/selftend/issues/982)) ([#1015](https://github.com/Selftend/selftend/issues/1015)) ([01620a6](https://github.com/Selftend/selftend/commit/01620a6c6b9088fcb18e33c9d3759b3139fa5efa))
* **store:** commit the Apple age-rating declaration and guard it ([#1021](https://github.com/Selftend/selftend/issues/1021)) ([#1025](https://github.com/Selftend/selftend/issues/1025)) ([a06ed05](https://github.com/Selftend/selftend/commit/a06ed05ea41f4bf51daa0fb9714998cd0578e968))


### Bug Fixes

* canonical _one plural suffix ends Weblate's duplicated-identifier alert ([#946](https://github.com/Selftend/selftend/issues/946)) ([506df5b](https://github.com/Selftend/selftend/commit/506df5bac336ed0b470e9e193f0cad1d2285e618))
* **copy:** &quot;no pressure&quot; stops advertising the product's restraint ([#963](https://github.com/Selftend/selftend/issues/963)) ([#1030](https://github.com/Selftend/selftend/issues/1030)) ([726eb92](https://github.com/Selftend/selftend/commit/726eb920b382a38c71cb138dca1bcd3d53123a09))
* **home:** an unrenderable dashboard says so instead of &quot;nothing added yet&quot; ([#964](https://github.com/Selftend/selftend/issues/964)) ([#1033](https://github.com/Selftend/selftend/issues/1033)) ([ead8c22](https://github.com/Selftend/selftend/commit/ead8c22f53ce1a8fb6c0bb59788fefcfa06e3e97))
* **i18n:** locale-aware one-decimal numbers and translated hour units ([#987](https://github.com/Selftend/selftend/issues/987)) ([2a770d3](https://github.com/Selftend/selftend/commit/2a770d31481a6563c1ce169c1489d91f70dfba62))
* **modules:** DBT stops advertising a module that does not exist ([#1020](https://github.com/Selftend/selftend/issues/1020)) ([#1024](https://github.com/Selftend/selftend/issues/1024)) ([0ccfcd6](https://github.com/Selftend/selftend/commit/0ccfcd692503ff83b111f44ccb4446817b4fc555))
* **nav:** lateral navigation reuses a screen instead of stacking a copy ([#1027](https://github.com/Selftend/selftend/issues/1027)) ([#1028](https://github.com/Selftend/selftend/issues/1028)) ([d44daff](https://github.com/Selftend/selftend/commit/d44dafffaf60a3e50c0f43eea6f0d950c3ad6c36))
* **nav:** the panel returns to a screen instead of stacking a second one ([#989](https://github.com/Selftend/selftend/issues/989)) ([#1026](https://github.com/Selftend/selftend/issues/1026)) ([f245997](https://github.com/Selftend/selftend/commit/f24599751e07efe3cb926ce74b5b5f691a6253b3))
* **privacy:** cookie consent can be withdrawn again ([#969](https://github.com/Selftend/selftend/issues/969)) ([#1031](https://github.com/Selftend/selftend/issues/1031)) ([01a571c](https://github.com/Selftend/selftend/commit/01a571c9f42a445af7d92d4b4b49301e6887eeda))
* **privacy:** the mood score no longer rides a Sentry navigation breadcrumb ([#996](https://github.com/Selftend/selftend/issues/996)) ([#1029](https://github.com/Selftend/selftend/issues/1029)) ([3afcf87](https://github.com/Selftend/selftend/commit/3afcf8737618d15e9994b90c6da8f8a208459dbe))
* **privacy:** the mood score no longer rides an in-app URL ([#995](https://github.com/Selftend/selftend/issues/995)) ([061d677](https://github.com/Selftend/selftend/commit/061d677f05590e5c5909ea021d84705cdc9fc76e))
* **profile:** the header and settings agree on one avatar expression ([#970](https://github.com/Selftend/selftend/issues/970)) ([#1032](https://github.com/Selftend/selftend/issues/1032)) ([0bfaba8](https://github.com/Selftend/selftend/commit/0bfaba8f5a76ac77c94332dedea17fb19d003392))


### Performance Improvements

* **home:** fourteen list fetches become fourteen one-row reads ([#990](https://github.com/Selftend/selftend/issues/990)) ([#1023](https://github.com/Selftend/selftend/issues/1023)) ([d91a669](https://github.com/Selftend/selftend/commit/d91a669b9fa3f45bf06a582ef0414a5ef148666d))

## [0.13.0](https://github.com/Selftend/selftend/compare/v0.12.0...v0.13.0) (2026-08-12)


### Features

* **breathing:** patterns become the page, and the accent palette is the measured six ([#804](https://github.com/Selftend/selftend/issues/804)) ([13e355d](https://github.com/Selftend/selftend/commit/13e355d90955ad8fd4062b9567f8885a403c14cb))
* bring check-in to the amended 2a/2b/2c design ([#869](https://github.com/Selftend/selftend/issues/869) [#870](https://github.com/Selftend/selftend/issues/870) [#871](https://github.com/Selftend/selftend/issues/871) [#872](https://github.com/Selftend/selftend/issues/872) [#884](https://github.com/Selftend/selftend/issues/884) [#885](https://github.com/Selftend/selftend/issues/885)) ([#858](https://github.com/Selftend/selftend/issues/858)) ([7d63b7f](https://github.com/Selftend/selftend/commit/7d63b7f81c2197bbec63fa9b747a3844852c71ad))
* **check-in:** add the all-history screen at /tools/check-in/history ([#747](https://github.com/Selftend/selftend/issues/747)) ([41663ed](https://github.com/Selftend/selftend/commit/41663ede5580dd14ac299bd5f329c2c73a362444))
* **check-in:** animate the mood emoji scale, and nothing else ([#755](https://github.com/Selftend/selftend/issues/755)) ([a7584e4](https://github.com/Selftend/selftend/commit/a7584e4a9d48f6e8e3e6b7b8f2b903bd4941ed5e))
* **check-in:** distribution chart on a range it shares with the trend ([#752](https://github.com/Selftend/selftend/issues/752)) ([a89c057](https://github.com/Selftend/selftend/commit/a89c057090ad9f4140c1a0413e772194f836c930))
* **check-in:** emotion picker becomes one flat run of chips ([#753](https://github.com/Selftend/selftend/issues/753)) ([6e42190](https://github.com/Selftend/selftend/commit/6e421905b0db1505cbf6217ea1d885e292da97c1))
* **check-in:** entry detail becomes conditional hairline rows ([#756](https://github.com/Selftend/selftend/issues/756)) ([463deba](https://github.com/Selftend/selftend/commit/463deba11c7e96609a7d0abf3d94c60ecc5d388c))
* **check-in:** go deeper hands off to a thought record ([#754](https://github.com/Selftend/selftend/issues/754)) ([e14f3fb](https://github.com/Selftend/selftend/commit/e14f3fbbfdcbd21c429a973725d97ec6bc8a97db))
* **check-in:** manage emotions works on a phone, and delete says what it costs ([#757](https://github.com/Selftend/selftend/issues/757)) ([4d4dd47](https://github.com/Selftend/selftend/commit/4d4dd4734b04c89b87014082d7533b09ea5e8574))
* **check-in:** navigable calendar weeks with a day panel ([#751](https://github.com/Selftend/selftend/issues/751)) ([8027210](https://github.com/Selftend/selftend/commit/80272102b5977e63bee99e429ea9880da271335a))
* **check-in:** onboarding describes the screen that now exists ([#758](https://github.com/Selftend/selftend/issues/758)) ([fc69933](https://github.com/Selftend/selftend/commit/fc699338ef8c1f626fa9424ce7570ebd4e87a850))
* **check-in:** plain scroll root, staged sections, history moves out ([#750](https://github.com/Selftend/selftend/issues/750)) ([c0305e3](https://github.com/Selftend/selftend/commit/c0305e3d8b57ad06b01ed1b1e9efc4301944d3e0))
* **chrome:** replace the module-home shell across all ten modules ([#746](https://github.com/Selftend/selftend/issues/746)) ([a4cc900](https://github.com/Selftend/selftend/commit/a4cc9006847876fd9c4314cdb6a9ceab30693a52))
* close the three habits design-conformance gaps ([#857](https://github.com/Selftend/selftend/issues/857)) ([60ec536](https://github.com/Selftend/selftend/commit/60ec536d3b0d1df8d690368a08d504e8c2cee717))
* de-card the sleep overview to hairline sections ([#878](https://github.com/Selftend/selftend/issues/878)) ([#896](https://github.com/Selftend/selftend/issues/896)) ([bd1b25d](https://github.com/Selftend/selftend/commit/bd1b25dff6c93947ec984c752378813eda8fd136))
* **dev:** boot Docker Desktop automatically before the local Supabase stack ([#687](https://github.com/Selftend/selftend/issues/687)) ([baf0d0d](https://github.com/Selftend/selftend/commit/baf0d0df356761fffd50044578793a12b4a33420))
* **dev:** boot the local Supabase stack automatically from the dev launchers ([#686](https://github.com/Selftend/selftend/issues/686)) ([c2592c3](https://github.com/Selftend/selftend/commit/c2592c3c281ecec1bccb36f2cd20a572b4e9025a))
* fold skills and reflection prompts into the stages expansion, drop the stage detail screen ([#851](https://github.com/Selftend/selftend/issues/851)) ([#920](https://github.com/Selftend/selftend/issues/920)) ([432b5fa](https://github.com/Selftend/selftend/commit/432b5faa4692934f0a904fbc1b16f8b6dbf095f3))
* gratitude adopts the design language — eyebrows, primary bars, quiet detail chrome ([#877](https://github.com/Selftend/selftend/issues/877)) ([#897](https://github.com/Selftend/selftend/issues/897)) ([3ad8777](https://github.com/Selftend/selftend/commit/3ad8777a9094fe17adec2e2feb9f079373e3a8ff))
* grounding overview adopts Section eyebrows and hairline technique rows ([#875](https://github.com/Selftend/selftend/issues/875)) ([#894](https://github.com/Selftend/selftend/issues/894)) ([9c66426](https://github.com/Selftend/selftend/commit/9c6642647fe5284d3a42afe7e00e12a3b01b0008))
* grounding session adopts FocusSessionShell; the intro phase is dropped ([#874](https://github.com/Selftend/selftend/issues/874)) ([#891](https://github.com/Selftend/selftend/issues/891)) ([9d3acdd](https://github.com/Selftend/selftend/commit/9d3acdd9f610aa1d3c77f46a4c64c0b784446301))
* **habits:** every habit every day, three cell states, inline ticking ([#792](https://github.com/Selftend/selftend/issues/792)) ([4a3a826](https://github.com/Selftend/selftend/commit/4a3a82656ca159aefeed921c19bc521bb859e49f))
* **habits:** four prompts become three, and the refinements fold away ([#793](https://github.com/Selftend/selftend/issues/793)) ([515e11f](https://github.com/Selftend/selftend/commit/515e11f874d1a4a9b81289e082f96ca3a27bc332))
* **habits:** history pages to the end, and the overview stops disagreeing with itself ([#795](https://github.com/Selftend/selftend/issues/795)) ([db30398](https://github.com/Selftend/selftend/commit/db3039887ed4be9c6e87f92ef21c37dacaa63a05))
* **habits:** one insight survives, and Learn gets a front door ([#806](https://github.com/Selftend/selftend/issues/806)) ([e65ab3a](https://github.com/Selftend/selftend/commit/e65ab3a48a43a1351179df92b82e66ad61af19d0))
* **habits:** six measurably-distinct colours, auto-assigned ([#791](https://github.com/Selftend/selftend/issues/791)) ([a8276cf](https://github.com/Selftend/selftend/commit/a8276cf60d9e1732ba61517a6a0a64300b8d0594))
* **habits:** twelve weeks of ticks, notes that reopen their own day ([#803](https://github.com/Selftend/selftend/issues/803)) ([16c4f2d](https://github.com/Selftend/selftend/commit/16c4f2d44c5707573f52bd3125cfbcd81b906bc4))
* **journal:** redesign overview ([#836](https://github.com/Selftend/selftend/issues/836)) ([e09a689](https://github.com/Selftend/selftend/commit/e09a6896f6e5403bf47e1862396e2a173a0cc696))
* **journal:** the writing gets the page ([#794](https://github.com/Selftend/selftend/issues/794)) ([09d8759](https://github.com/Selftend/selftend/commit/09d87593fb297cba45dc6aa2ba6904498b68b33e))
* manage emotions becomes a dialog on desktop web, a drawer on mobile web ([#905](https://github.com/Selftend/selftend/issues/905)) ([#914](https://github.com/Selftend/selftend/issues/914)) ([1081334](https://github.com/Selftend/selftend/commit/1081334c4f738244b99c9b7524ff005a5cedf1a9))
* **meditation:** length is a row of choices, and the record reaches its end ([#796](https://github.com/Selftend/selftend/issues/796)) ([874ef46](https://github.com/Selftend/selftend/commit/874ef46baf4bff092f959084054c152721fbc79f))
* **meditation:** ten cards become a spine, and nobody is told they are behind ([#798](https://github.com/Selftend/selftend/issues/798)) ([cb6c677](https://github.com/Selftend/selftend/commit/cb6c6776e4f13dbb7666e532c93a4375a1b8cb20))
* **mood:** rename the check-in route to /tools/check-in ([#745](https://github.com/Selftend/selftend/issues/745)) ([98ca370](https://github.com/Selftend/selftend/commit/98ca37092736f462838294081c86863cf4cc6f44))
* practices get a route, daily-life joins the page rhythm, insights rebuilt on surviving inputs ([#853](https://github.com/Selftend/selftend/issues/853)) ([#921](https://github.com/Selftend/selftend/issues/921)) ([bb8de87](https://github.com/Selftend/selftend/commit/bb8de87f7f502c4dc2ca3f8a4c180eaf343d5478))
* rebuild breathing session screen on the shared focus shell ([#848](https://github.com/Selftend/selftend/issues/848)) ([e7b5231](https://github.com/Selftend/selftend/commit/e7b523151fb6c2cc7b83cf03eddd829598e0f70a))
* rebuild the meditation sit and reflection on the focus shell ([#850](https://github.com/Selftend/selftend/issues/850)) ([d6667f2](https://github.com/Selftend/selftend/commit/d6667f24dd5cff9f772ba9b23c504c54d28829bb))
* redesign gratitude logging flow ([ad7a056](https://github.com/Selftend/selftend/commit/ad7a056443b07c5f27644c06f63a251a5822b167))
* redesign grounding sessions and history ([5d49d29](https://github.com/Selftend/selftend/commit/5d49d29fdb62d79d16d29f4056c323ec668b1e07))
* restyle the crisis-support bar to a hairline row; grounding home gains one ([#887](https://github.com/Selftend/selftend/issues/887)) ([#890](https://github.com/Selftend/selftend/issues/890)) ([6ac7915](https://github.com/Selftend/selftend/commit/6ac79158d5caa4fa5db82fae469b7c599fcf5662))
* sleep entries may opt into an encrypted sleep window ([#854](https://github.com/Selftend/selftend/issues/854)) ([000001e](https://github.com/Selftend/selftend/commit/000001e962cbda0157bf55785e42b80c513d86a9))
* sleep overview rows, paged all-history, and single-line entry detail ([#856](https://github.com/Selftend/selftend/issues/856)) ([a6c35e5](https://github.com/Selftend/selftend/commit/a6c35e5915eef5d4f97d544b6df1af811b71f7ff))
* **sleep:** quality becomes five labelled columns, and the worst night stops being the faintest ([#799](https://github.com/Selftend/selftend/issues/799)) ([03e8af6](https://github.com/Selftend/selftend/commit/03e8af620c850a20f541edc1b9266ea8d7b0fe6e)), closes [#773](https://github.com/Selftend/selftend/issues/773)
* tool names align on the bare design names - Breathing and Sleep drop their suffixes ([#888](https://github.com/Selftend/selftend/issues/888)) ([#895](https://github.com/Selftend/selftend/issues/895)) ([de66d73](https://github.com/Selftend/selftend/commit/de66d734a7d42fa65c1a2fdfade4c384e4255321))
* trend presets become pannable viewports over the whole history ([#900](https://github.com/Selftend/selftend/issues/900)) ([#908](https://github.com/Selftend/selftend/issues/908)) ([6f0bf38](https://github.com/Selftend/selftend/commit/6f0bf38db9db9de42e2a156806e12efa9ac12f0a))


### Bug Fixes

* address grounding review feedback ([ad37ef8](https://github.com/Selftend/selftend/commit/ad37ef80d4b1720b424dc4e52c94f32f3d1e4075))
* align gratitude review and e2e coverage ([fc59076](https://github.com/Selftend/selftend/commit/fc590766303e4e19746c8c3915e73ae0285651ec))
* breathing pattern rows' play arrow goes neutral, the dot alone carries the pattern colour ([#925](https://github.com/Selftend/selftend/issues/925)) ([#935](https://github.com/Selftend/selftend/issues/935)) ([7eeaf3c](https://github.com/Selftend/selftend/commit/7eeaf3c0f94c664c88f97857993531fb75c763b7))
* breathing session setup takes the 620px form column ([#873](https://github.com/Selftend/selftend/issues/873)) ([#893](https://github.com/Selftend/selftend/issues/893)) ([0c04146](https://github.com/Selftend/selftend/commit/0c041468fc667744f6a43ae61d73e332b006e414))
* breathing setup controls ride theme tokens, the pattern colour stays on the dot and the pacer ([#926](https://github.com/Selftend/selftend/issues/926)) ([#936](https://github.com/Selftend/selftend/issues/936)) ([a5c57e7](https://github.com/Selftend/selftend/commit/a5c57e77b0e152fba6616ef9ae6149135408738b))
* **charts:** make sleep trends legible ([#842](https://github.com/Selftend/selftend/issues/842)) ([c193298](https://github.com/Selftend/selftend/commit/c193298ec10a0cd2e49f2cdc98ba88e73707b0c3))
* crisis row shows on create check-in only, not edit ([#906](https://github.com/Selftend/selftend/issues/906)) ([#916](https://github.com/Selftend/selftend/issues/916)) ([7c6d0d5](https://github.com/Selftend/selftend/commit/7c6d0d52edea3f94914395828ae764aff94fd298))
* cut 'You are not behind.' from Learn non-linear body in both locales ([#852](https://github.com/Selftend/selftend/issues/852)) ([#919](https://github.com/Selftend/selftend/issues/919)) ([c5898bf](https://github.com/Selftend/selftend/commit/c5898bf93550a152f36f2e3184aa7a51cce5565e))
* **db:** read the base table in sleep_stats, and correct ADR-0001's view clause ([#730](https://github.com/Selftend/selftend/issues/730)) ([3d03bbd](https://github.com/Selftend/selftend/commit/3d03bbdad1367b6aac4fbdfad66bf4c38b919f92)), closes [#706](https://github.com/Selftend/selftend/issues/706)
* drop the "unused" tag from Manage emotions rows ([#903](https://github.com/Selftend/selftend/issues/903)) ([#913](https://github.com/Selftend/selftend/issues/913)) ([988002e](https://github.com/Selftend/selftend/commit/988002ed839d87723dec65bde815aa071e11097c))
* entry-detail Edit pill takes the default button height ([#901](https://github.com/Selftend/selftend/issues/901)) ([#910](https://github.com/Selftend/selftend/issues/910)) ([5b806f8](https://github.com/Selftend/selftend/commit/5b806f8c8e18ec5fa3ae370428cafb6c88161e69))
* **github:** apply the triage label issue forms actually ask for ([#719](https://github.com/Selftend/selftend/issues/719)) ([263d4cf](https://github.com/Selftend/selftend/commit/263d4cf7517e24a9e7e76db0b602bd73efab78c2))
* gratitude editor lines wear their questions again, placeholders and prompt chips retire ([#929](https://github.com/Selftend/selftend/issues/929)) ([#939](https://github.com/Selftend/selftend/issues/939)) ([fec2fcb](https://github.com/Selftend/selftend/commit/fec2fcb70da95b560999c6179060ec2f353e3f89))
* grounding sense icon centres in its badge, the glyph box derives from iconSize and the size table retires ([#927](https://github.com/Selftend/selftend/issues/927)) ([#937](https://github.com/Selftend/selftend/issues/937)) ([4e355f6](https://github.com/Selftend/selftend/commit/4e355f63e4a873605d0fbafcb395579ba249ec80))
* grounding session gets a visible exit, the inline Finish early button arrives and the back-confirm actually leaves ([#928](https://github.com/Selftend/selftend/issues/928)) ([#938](https://github.com/Selftend/selftend/issues/938)) ([07b906b](https://github.com/Selftend/selftend/commit/07b906b7838ae5569e4f7d6c26a69a58629f335f))
* **i18n:** align module header stats ([#841](https://github.com/Selftend/selftend/issues/841)) ([3c1b7e8](https://github.com/Selftend/selftend/commit/3c1b7e8f438ad9bdb4fa0af25e33c951918af8db))
* **i18n:** bg "patterns over time" meant templates, not trends ([#827](https://github.com/Selftend/selftend/issues/827)) ([ae0170d](https://github.com/Selftend/selftend/commit/ae0170ddf4539d0837c6fadcad0e61c0e10011e4))
* icon glyphs resolve arbitrary px sizes, the 24px-glyph-in-an-18px-box mismatch ends ([#931](https://github.com/Selftend/selftend/issues/931)) ([#941](https://github.com/Selftend/selftend/issues/941)) ([82e7b59](https://github.com/Selftend/selftend/commit/82e7b5945d6a2cfd897412dc7eed27cb2b108ab5))
* label the tool all-history breadcrumbs, never the raw slug-template key ([#876](https://github.com/Selftend/selftend/issues/876)) ([#892](https://github.com/Selftend/selftend/issues/892)) ([d2678c4](https://github.com/Selftend/selftend/commit/d2678c4a12c61ce750b132f192e88c777ae8fb6d))
* meditation length rides a per-minute slider again, steppers carry the precision ([#930](https://github.com/Selftend/selftend/issues/930)) ([#940](https://github.com/Selftend/selftend/issues/940)) ([cefa41a](https://github.com/Selftend/selftend/commit/cefa41a4c32bd05695f7f11d7ef9912b51e069bf))
* **modals:** stop rendering modal backdrops as buttons wrapping the card ([#688](https://github.com/Selftend/selftend/issues/688)) ([90bcf6a](https://github.com/Selftend/selftend/commit/90bcf6abe50f9efba0acd345c2d71c99fd5b1369))
* mood map drops its range picker — always all history ([#899](https://github.com/Selftend/selftend/issues/899)) ([#907](https://github.com/Selftend/selftend/issues/907)) ([e2e07bf](https://github.com/Selftend/selftend/commit/e2e07bfc30719b50b6cc60960ec8401d9b7767cf))
* mood score ramp follows the active style's accent, hue-ramp machinery retires ([#924](https://github.com/Selftend/selftend/issues/924)) ([#934](https://github.com/Selftend/selftend/issues/934)) ([3bc609a](https://github.com/Selftend/selftend/commit/3bc609ad6d3b9341c01a98a647de6cd16fd8a49b))
* **mood:** settle failed history reads promptly ([#843](https://github.com/Selftend/selftend/issues/843)) ([628fbe6](https://github.com/Selftend/selftend/commit/628fbe6684b46950c2ea91bae04be8591f8c475d))
* **mood:** stop the mood map outlining unlogged days and not logged ones ([#728](https://github.com/Selftend/selftend/issues/728)) ([5bc8e0c](https://github.com/Selftend/selftend/commit/5bc8e0ce41b42ffcfb9936dd950366ec71ad9501)), closes [#717](https://github.com/Selftend/selftend/issues/717)
* **mood:** window Felt most often to the week it is labelled with ([#729](https://github.com/Selftend/selftend/issues/729)) ([79059bc](https://github.com/Selftend/selftend/commit/79059bc838fe02a78cb9c8abf6023b309ad2e042)), closes [#705](https://github.com/Selftend/selftend/issues/705)
* move the Manage emotions drag handle out of the row press target so a web drag release cannot open the editor ([#915](https://github.com/Selftend/selftend/issues/915)) ([#922](https://github.com/Selftend/selftend/issues/922)) ([99dfa57](https://github.com/Selftend/selftend/commit/99dfa5799410b0453aa3f5ba01027b82b8169f13))
* notes textarea grows with the text ([#902](https://github.com/Selftend/selftend/issues/902)) ([#912](https://github.com/Selftend/selftend/issues/912)) ([7ffa62e](https://github.com/Selftend/selftend/commit/7ffa62ece59b3623613c76235efc00b5630cc6db))
* **policies:** the reminders FAQ answers with control, not with an absent penalty ([#834](https://github.com/Selftend/selftend/issues/834)) ([f5e7727](https://github.com/Selftend/selftend/commit/f5e77271d476599f2d3b00ec2dee0a3f7e5a8886)), closes [#805](https://github.com/Selftend/selftend/issues/805)
* **reminders:** the reminder cron drains by keyset, so nobody is skipped ([#832](https://github.com/Selftend/selftend/issues/832)) ([cde3386](https://github.com/Selftend/selftend/commit/cde338616873e19aef8b4ec724574c61320f7058)), closes [#831](https://github.com/Selftend/selftend/issues/831)
* **settings:** reset onboarding clears every flag, and the guard can see drift ([#833](https://github.com/Selftend/selftend/issues/833)) ([5c1562f](https://github.com/Selftend/selftend/commit/5c1562fcca74d258fc5994185176caace3302977)), closes [#821](https://github.com/Selftend/selftend/issues/821) [#822](https://github.com/Selftend/selftend/issues/822)
* sleep and journal detail Edit pills take the default button height ([#911](https://github.com/Selftend/selftend/issues/911)) ([#917](https://github.com/Selftend/selftend/issues/917)) ([5631433](https://github.com/Selftend/selftend/commit/5631433f082817c4419fd82fd6c919a57fe0fd9f))
* the ticked-today button names its undo, un-ticking becomes discoverable ([#932](https://github.com/Selftend/selftend/issues/932)) ([#942](https://github.com/Selftend/selftend/issues/942)) ([64bac07](https://github.com/Selftend/selftend/commit/64bac072595659e7d2fb6e89e4ae23151e4e59eb))
* use stable cursors for history paging ([#844](https://github.com/Selftend/selftend/issues/844)) ([fc59717](https://github.com/Selftend/selftend/commit/fc59717cf2d455ef59e06cdd4dab7ad590947c87))

## [0.12.0](https://github.com/Selftend/selftend/compare/v0.11.2...v0.12.0) (2026-08-06)


### Features

* **nav:** invisible header + overlay-panel shell for signed-in surfaces ([#675](https://github.com/Selftend/selftend/issues/675)) ([14a1c9d](https://github.com/Selftend/selftend/commit/14a1c9d95a3ff842282fb8339cac3d1de2285c25))
* **nav:** invisible header on signed-out surfaces, old top bar retired ([#678](https://github.com/Selftend/selftend/issues/678)) ([2e5d1f2](https://github.com/Selftend/selftend/commit/2e5d1f2a02e441b7ffc0ad6b1376b675deea25c2)), closes [#669](https://github.com/Selftend/selftend/issues/669)
* **nav:** Reddit and YouTube join the UserMenu social row ([#677](https://github.com/Selftend/selftend/issues/677)) ([efd5521](https://github.com/Selftend/selftend/commit/efd5521f8114d63b0c6d7151d98e8a1e9cba854d)), closes [#668](https://github.com/Selftend/selftend/issues/668)
* **nav:** web modal keyboard story for the navigation panel ([#680](https://github.com/Selftend/selftend/issues/680)) ([a8c874f](https://github.com/Selftend/selftend/commit/a8c874f3d9d8eb339a68e4953badd37b61a8d789)), closes [#671](https://github.com/Selftend/selftend/issues/671)
* **routines:** RoutineFab rides above bottom-anchored banners ([#679](https://github.com/Selftend/selftend/issues/679)) ([85902ac](https://github.com/Selftend/selftend/commit/85902ac3fc9c2951d646c2953a186e57c4dd0dd1)), closes [#670](https://github.com/Selftend/selftend/issues/670)


### Bug Fixes

* **a11y:** put the chrome's web Tab order in visual order ([#682](https://github.com/Selftend/selftend/issues/682)) ([4f648f5](https://github.com/Selftend/selftend/commit/4f648f54643e246d0e2e5d6ea444461fc04e59a5)), closes [#673](https://github.com/Selftend/selftend/issues/673)

## [0.11.2](https://github.com/Selftend/selftend/compare/v0.11.1...v0.11.2) (2026-08-05)


### Bug Fixes

* **deps:** bump brace-expansion override to 5.0.9 ([#641](https://github.com/Selftend/selftend/issues/641)) ([8df841f](https://github.com/Selftend/selftend/commit/8df841fea76396a38936d3147b5bf09052e4764d))
* **ui:** compose the breathing session screen vertically ([#642](https://github.com/Selftend/selftend/issues/642)) ([c4a484b](https://github.com/Selftend/selftend/commit/c4a484b14042fbc6ba912e2f8c9c873c51e70687))
* **ui:** remove field-to-sheet seam ([#637](https://github.com/Selftend/selftend/issues/637)) ([9eaf53a](https://github.com/Selftend/selftend/commit/9eaf53a95cfc078a7d4770e7fa5df5a7f7665d02))

## [0.11.1](https://github.com/Selftend/selftend/compare/v0.11.0...v0.11.1) (2026-08-01)


### Bug Fixes

* **a11y:** match arbitrary destructive opacity in the wash gate ([#609](https://github.com/Selftend/selftend/issues/609)) ([aab0f3a](https://github.com/Selftend/selftend/commit/aab0f3af7ce4fd88a172466ec7b312f51a20612f))
* **a11y:** stop pairing destructive text with a wash of its own red ([#607](https://github.com/Selftend/selftend/issues/607)) ([3ae382d](https://github.com/Selftend/selftend/commit/3ae382d96061b35d0a70922cb3ab26375e0775a9))

## [0.11.0](https://github.com/Selftend/selftend/compare/v0.10.0...v0.11.0) (2026-08-01)


### Features

* **theme:** add the neutral primitives the sweep will migrate onto ([#596](https://github.com/Selftend/selftend/issues/596)) ([a704e3f](https://github.com/Selftend/selftend/commit/a704e3fb518ad8b5da0433c31ec9ffdd47db92c1))
* **theme:** add the palette control to the user menu and settings ([#594](https://github.com/Selftend/selftend/issues/594)) ([df864e1](https://github.com/Selftend/selftend/commit/df864e181a5006614da4bb477f2f7a21bde6129f))
* **theme:** author the eight palettes as data ([#592](https://github.com/Selftend/selftend/issues/592)) ([1e3cdbe](https://github.com/Selftend/selftend/commit/1e3cdbe66dbd784cb97fe61932d9aa46e5ba7675))
* **theme:** chrome, decorative hue and single-series charts go neutral ([#599](https://github.com/Selftend/selftend/issues/599)) ([5ee724b](https://github.com/Selftend/selftend/commit/5ee724ba9146be4c7b00da01d378f871aa7d1fd6))
* **theme:** delete the hue surface and lock it with a lint gate ([#600](https://github.com/Selftend/selftend/issues/600)) ([5c2d9c0](https://github.com/Selftend/selftend/commit/5c2d9c0573518f1e75a5ec75448e1a1ec43ff72f))
* **theme:** module and tool identity becomes icon and label ([#598](https://github.com/Selftend/selftend/issues/598)) ([f6e2195](https://github.com/Selftend/selftend/commit/f6e2195ee59a951cf2bb749140cc493691e61e22))
* **theme:** move the token contract into TypeScript ([#590](https://github.com/Selftend/selftend/issues/590)) ([2f0e59a](https://github.com/Selftend/selftend/commit/2f0e59a106b278a3c0bc04ccb219922efecf929f))
* **theme:** plumb the style axis through the provider ([#593](https://github.com/Selftend/selftend/issues/593)) ([e49b22a](https://github.com/Selftend/selftend/commit/e49b22afd9d065f99b74e1e47ad95bd311461d30))
* **theme:** rooms and field gradients go neutral ([#597](https://github.com/Selftend/selftend/issues/597)) ([d6d0c24](https://github.com/Selftend/selftend/commit/d6d0c243ec95410920b96713d39261986b2fa553))
* **theme:** solve ink contrast instead of pinning it ([#591](https://github.com/Selftend/selftend/issues/591)) ([ca62a52](https://github.com/Selftend/selftend/commit/ca62a5281b9efaeff22b7d5f1483e8a87f3453cf))
* **theme:** web first paint and shell follow the selected palette ([#595](https://github.com/Selftend/selftend/issues/595)) ([db73abd](https://github.com/Selftend/selftend/commit/db73abd45b2251737b281175b46a53934f9842a2))


### Bug Fixes

* **theme:** solve the destructive red per palette, and gate it ([#602](https://github.com/Selftend/selftend/issues/602)) ([a053874](https://github.com/Selftend/selftend/commit/a0538747e271baa2a64cce74696e5f9fcf96a43e))
* **theme:** the last three static purples follow the selected palette ([#601](https://github.com/Selftend/selftend/issues/601)) ([5874513](https://github.com/Selftend/selftend/commit/5874513f34c1d0c6ca113038192a3711849c7997))

## [0.10.0](https://github.com/Selftend/selftend/compare/v0.9.0...v0.10.0) (2026-07-31)


### Features

* **auth:** Sign in with Apple ([#544](https://github.com/Selftend/selftend/issues/544)) ([7e2586b](https://github.com/Selftend/selftend/commit/7e2586b83b48e66ef15a2eb66b4b83cdca1cceeb)), closes [#542](https://github.com/Selftend/selftend/issues/542)
* **i18n:** follow the device language on first run ([#554](https://github.com/Selftend/selftend/issues/554)) ([bb62af8](https://github.com/Selftend/selftend/commit/bb62af8974119ca0670b5ea5f81e74fadc39d6d0))
* **ios:** Universal Links for the email-auth callback ([#552](https://github.com/Selftend/selftend/issues/552)) ([8dee5e6](https://github.com/Selftend/selftend/commit/8dee5e6a44d9c25c3dc929876f674f6ff546d1dd))


### Bug Fixes

* **auth:** stop truncating verification codes, and drop the email link ([#550](https://github.com/Selftend/selftend/issues/550)) ([870a865](https://github.com/Selftend/selftend/commit/870a86517e2ce247a202e3ae921823ccec014965))
* **ios:** declare Bulgarian in the bundle so iOS can select it ([#535](https://github.com/Selftend/selftend/issues/535)) ([04daea4](https://github.com/Selftend/selftend/commit/04daea49c7cdaa9474aaa09c4a75a868b7d4ab6e))
* **policies:** bump the policy version for the Apple processor disclosure ([#575](https://github.com/Selftend/selftend/issues/575)) ([63fa614](https://github.com/Selftend/selftend/commit/63fa614f1791662213f23baa234533879ca0669a))

## [0.9.0](https://github.com/Selftend/selftend/compare/v0.8.0...v0.9.0) (2026-07-30)


### Features

* **ci:** iOS TestFlight release pipeline ([#518](https://github.com/Selftend/selftend/issues/518)) ([b879a38](https://github.com/Selftend/selftend/commit/b879a384e78a199f73b61290b970e3d56cc559f9))
* **nav+design:** structural breadcrumb back, remove the field parallax ([#509](https://github.com/Selftend/selftend/issues/509)) ([de2df9e](https://github.com/Selftend/selftend/commit/de2df9eb2d3cf3865ae9fce0b2379ef6392e4561))
* **store:** version document, update banner, Android download bar, in-app version ([#517](https://github.com/Selftend/selftend/issues/517)) ([53b0edf](https://github.com/Selftend/selftend/commit/53b0edf851d824d5e0b0acb0e23007278a9223c4))


### Bug Fixes

* **auth:** keep the iOS session out of device backups ([#530](https://github.com/Selftend/selftend/issues/530)) ([20d5b04](https://github.com/Selftend/selftend/commit/20d5b04b7227a84a5c12ef3196d8e1684a191e2a)), closes [#528](https://github.com/Selftend/selftend/issues/528)
* **ios:** honest update offers, opaque icon, dark splash ([#533](https://github.com/Selftend/selftend/issues/533)) ([1ac2381](https://github.com/Selftend/selftend/commit/1ac238106e08c79e0a8f4c17d6e2c1cdc4eeb38d))
* **store:** send iOS update offers to the App Store, not Google Play ([#531](https://github.com/Selftend/selftend/issues/531)) ([f0c12da](https://github.com/Selftend/selftend/commit/f0c12da05055b39f64c21ba7f9e068ae4b4adfdb)), closes [#529](https://github.com/Selftend/selftend/issues/529)

## [0.8.0](https://github.com/Selftend/selftend/compare/v0.7.0...v0.8.0) (2026-07-29)


### Features

* **auth:** sign in without verification, verify banner owns mailbox proof ([#499](https://github.com/Selftend/selftend/issues/499)) ([3020fc2](https://github.com/Selftend/selftend/commit/3020fc2b5597623b87408642385afeda551459a5))
* **design:** field parallax, CBT/ACT room headers, book-reference scrub ([#498](https://github.com/Selftend/selftend/issues/498)) ([eed75ac](https://github.com/Selftend/selftend/commit/eed75ac8830b85268298b14b04b1ed7798db4859))
* **nav:** back button in the breadcrumb row ([#497](https://github.com/Selftend/selftend/issues/497)) ([68a921f](https://github.com/Selftend/selftend/commit/68a921f372cd7d645e3282ecd4ffd5c9516fa7b0))


### Bug Fixes

* **a11y:** human labels for the gratitude favorites breadcrumb and habit tick days ([#485](https://github.com/Selftend/selftend/issues/485)) ([ee1a3dc](https://github.com/Selftend/selftend/commit/ee1a3dcbe3f4a3426c3ce45004ee72d7202e0f3a))
* **auth:** map raw Supabase errors to translated copy on reset- and update-password ([#470](https://github.com/Selftend/selftend/issues/470)) ([#478](https://github.com/Selftend/selftend/issues/478)) ([daecb1c](https://github.com/Selftend/selftend/commit/daecb1ccc47fdf49d0073d2755cf9816716bcc6a))
* **auth:** the verify banner says so when the flag write no-ops ([#505](https://github.com/Selftend/selftend/issues/505)) ([7f3b32a](https://github.com/Selftend/selftend/commit/7f3b32afe5ef77cfacf0b265326db4f818e6c641)), closes [#504](https://github.com/Selftend/selftend/issues/504)
* **cbt:** confirm before archiving a thought record ([#481](https://github.com/Selftend/selftend/issues/481)) ([00cdf07](https://github.com/Selftend/selftend/commit/00cdf0729ab1667a8457ef278d7b6dd906d42870))
* **cbt:** fall back to the CBT index when back has no history ([#475](https://github.com/Selftend/selftend/issues/475)) ([#482](https://github.com/Selftend/selftend/issues/482)) ([8cce4aa](https://github.com/Selftend/selftend/commit/8cce4aa3587fa1ceb427c2b16fedcec6be4ed735))
* **cbt:** give the beliefs wizard a Discard draft affordance ([#486](https://github.com/Selftend/selftend/issues/486)) ([f59f37c](https://github.com/Selftend/selftend/commit/f59f37c6ddbd0628b9609f75ae2c38696ec88d6f))
* **cbt:** show the activity schedule in its captured frame, not raw UTC ISO ([#477](https://github.com/Selftend/selftend/issues/477)) ([#483](https://github.com/Selftend/selftend/issues/483)) ([61d8a99](https://github.com/Selftend/selftend/commit/61d8a995cf7f09c093288d124151ba17a77f0f3b))
* **cbt:** unfreeze the beliefs and worry forms on web ([#476](https://github.com/Selftend/selftend/issues/476)) ([#484](https://github.com/Selftend/selftend/issues/484)) ([92de186](https://github.com/Selftend/selftend/commit/92de1862df9a7e70927b551ef5963cc88f853260))
* **design:** restore home padding, pour the CBT field violet ([#503](https://github.com/Selftend/selftend/issues/503)) ([0e32c0e](https://github.com/Selftend/selftend/commit/0e32c0e911b32f545d74ad99738885454709fea5))
* **insights:** size the mood-trend chart to its card, not the window ([#472](https://github.com/Selftend/selftend/issues/472)) ([#479](https://github.com/Selftend/selftend/issues/479)) ([5132eea](https://github.com/Selftend/selftend/commit/5132eea77909590f87ab32e8f488428f80c4465c))
* **notifications:** reminder save gets an in-flight state, a subscription timeout, and translated errors ([#480](https://github.com/Selftend/selftend/issues/480)) ([e05f6af](https://github.com/Selftend/selftend/commit/e05f6afb9261f478ff9c76273b4f52c8ada58f10))
* **ui:** drop shadows on the dark theme, close the account menu on route change ([#496](https://github.com/Selftend/selftend/issues/496)) ([64766f0](https://github.com/Selftend/selftend/commit/64766f03dd19a072edd803641cffca60aee6009f))

## [0.7.0](https://github.com/Selftend/selftend/compare/v0.6.1...v0.7.0) (2026-07-28)


### Features

* **activities:** capture the civil day an activity was completed on and planned for ([#330](https://github.com/Selftend/selftend/issues/330)) ([#424](https://github.com/Selftend/selftend/issues/424)) ([f9fce78](https://github.com/Selftend/selftend/commit/f9fce782013131734b028336c4522d05de6cceac))
* **breathing,grounding:** capture the civil day a session was completed on ([#330](https://github.com/Selftend/selftend/issues/330)) ([#418](https://github.com/Selftend/selftend/issues/418)) ([2d3c811](https://github.com/Selftend/selftend/commit/2d3c8116c7121291bcb851502b66b7e1edc794ff))
* **breathing:** exercise editor joins the aqua room; create mode gets the field ([#307](https://github.com/Selftend/selftend/issues/307)) ([#311](https://github.com/Selftend/selftend/issues/311)) ([1535e18](https://github.com/Selftend/selftend/commit/1535e18dcad3a4966831b1026900c7c0a3067d68))
* **breathing:** home joins the aqua room with hue certification, field, sheet, and soft cards ([#306](https://github.com/Selftend/selftend/issues/306)) ([#309](https://github.com/Selftend/selftend/issues/309)) ([a8b76f3](https://github.com/Selftend/selftend/commit/a8b76f30632a3bd95b13f9e2f90b3d545a335d84))
* **breathing:** session screen takes the aqua pour; exercise stays the hero ([#308](https://github.com/Selftend/selftend/issues/308)) ([#312](https://github.com/Selftend/selftend/issues/312)) ([d477f4e](https://github.com/Selftend/selftend/commit/d477f4e072d892e858de3b572ef2b95069062d92))
* **cbt:** capture the civil day a thought record was written on ([#330](https://github.com/Selftend/selftend/issues/330)) ([#423](https://github.com/Selftend/selftend/issues/423)) ([2db6528](https://github.com/Selftend/selftend/commit/2db65283c3c83c66507841a04c9eb0cc4b2d5472))
* **charts:** shared BarChart migrates the sleep, gratitude, and habits bars ([#246](https://github.com/Selftend/selftend/issues/246)) ([dba1185](https://github.com/Selftend/selftend/commit/dba118551c218afe3aa486fe2d1416e3aae9e7f1)), closes [#237](https://github.com/Selftend/selftend/issues/237)
* **charts:** shared LineChart replaces the bespoke mood line chart ([#245](https://github.com/Selftend/selftend/issues/245)) ([d3e73f0](https://github.com/Selftend/selftend/commit/d3e73f0bae503f3d0e01000c917b03ff1f56883f)), closes [#236](https://github.com/Selftend/selftend/issues/236)
* **design:** certify the act hue with a light-scheme field stop override ([#279](https://github.com/Selftend/selftend/issues/279)) ([#285](https://github.com/Selftend/selftend/issues/285)) ([57c7cf3](https://github.com/Selftend/selftend/commit/57c7cf392e79d2e3a6e53d9b6b5440e91ff97c08))
* **design:** Nunito display face for headings and hero numerals ([#244](https://github.com/Selftend/selftend/issues/244)) ([22d85e3](https://github.com/Selftend/selftend/commit/22d85e3f482ac969564dd67bb669cf5eb8cdb502)), closes [#235](https://github.com/Selftend/selftend/issues/235)
* **export:** complete the GDPR export and gate it against the live schema ([#449](https://github.com/Selftend/selftend/issues/449)) ([7c2ced3](https://github.com/Selftend/selftend/commit/7c2ced33251275a0944563a197248af1e8da03b2))
* **gratitude,sleep,journal:** finish the captured-day migration ([#250](https://github.com/Selftend/selftend/issues/250)) ([#329](https://github.com/Selftend/selftend/issues/329)) ([e91ac68](https://github.com/Selftend/selftend/commit/e91ac68c4f5c19edb573da0dcb0f2698a40bf314))
* **gratitude:** editor joins the think room; create mode gets the field ([#270](https://github.com/Selftend/selftend/issues/270)) ([#274](https://github.com/Selftend/selftend/issues/274)) ([46e180a](https://github.com/Selftend/selftend/commit/46e180a6706a3b6085291194d5a005cb44ef1c95))
* **gratitude:** home becomes the think room — field, sheet, soft cards, last-logged subline ([#273](https://github.com/Selftend/selftend/issues/273)) ([512493e](https://github.com/Selftend/selftend/commit/512493e34d2194ec0aa23e0f4d3db3a40a14e305))
* **gratitude:** list, favorites, and detail join the think room ([#275](https://github.com/Selftend/selftend/issues/275)) ([024a47a](https://github.com/Selftend/selftend/commit/024a47a28cdc0f27647de8aea58fcf43a7782632))
* **grounding:** home joins the clay room with hue certification, field, sheet, and first test suite ([#316](https://github.com/Selftend/selftend/issues/316)) ([#318](https://github.com/Selftend/selftend/issues/318)) ([1ee35e5](https://github.com/Selftend/selftend/commit/1ee35e50a70bcb2bbd41ba3c9229fe1a4942294e))
* **grounding:** the flow takes the clay pour across every phase ([#317](https://github.com/Selftend/selftend/issues/317)) ([#324](https://github.com/Selftend/selftend/issues/324)) ([7de5319](https://github.com/Selftend/selftend/commit/7de531958ac0fc7d39e0cef8c301baac90cf5d9b))
* **habits:** detail joins the act room with its first test suite ([#288](https://github.com/Selftend/selftend/issues/288)) ([5ec09dc](https://github.com/Selftend/selftend/commit/5ec09dc48f2549ca8b1783a4a5958047d7609bb2))
* **habits:** editor joins the act room; create mode gets the field ([#281](https://github.com/Selftend/selftend/issues/281)) ([#287](https://github.com/Selftend/selftend/issues/287)) ([747635c](https://github.com/Selftend/selftend/commit/747635c73792bc7464d885b024914a7248fce4c9))
* **habits:** habit colors become a token alias layer with certified chips ([#325](https://github.com/Selftend/selftend/issues/325)) ([9dbd58c](https://github.com/Selftend/selftend/commit/9dbd58cf58b7d1e42fa547cb88ab552d1bdba4cc)), closes [#278](https://github.com/Selftend/selftend/issues/278)
* **habits:** home joins the act room with field header and last-tick subline ([#286](https://github.com/Selftend/selftend/issues/286)) ([460f9b9](https://github.com/Selftend/selftend/commit/460f9b9982168d27f75fb80cbeceb385dfaa3c8c))
* **habits:** learn index and article join the act room with first test suites ([#284](https://github.com/Selftend/selftend/issues/284)) ([#290](https://github.com/Selftend/selftend/issues/290)) ([cc9438b](https://github.com/Selftend/selftend/commit/cc9438b8664d082ded6f30e3462f10332e021380))
* **habits:** log note and history join the act room with first test suites ([#283](https://github.com/Selftend/selftend/issues/283)) ([#289](https://github.com/Selftend/selftend/issues/289)) ([9941fd5](https://github.com/Selftend/selftend/commit/9941fd5d842bdc587fbc4f0bff7e60d134fb3530))
* **journal:** detail joins the ink room with its first test suite ([#297](https://github.com/Selftend/selftend/issues/297)) ([#300](https://github.com/Selftend/selftend/issues/300)) ([37150cc](https://github.com/Selftend/selftend/commit/37150ccdce1ceff7c74129cf853d552af8f707d7))
* **journal:** editor joins the ink room; create mode gets the field ([#296](https://github.com/Selftend/selftend/issues/296)) ([#299](https://github.com/Selftend/selftend/issues/299)) ([f57901c](https://github.com/Selftend/selftend/commit/f57901cafe07fff2a681b58c1f72f96f68913e24))
* **journal:** home joins the ink room with field, sheet, and soft cards ([#295](https://github.com/Selftend/selftend/issues/295)) ([#298](https://github.com/Selftend/selftend/issues/298)) ([7ef1641](https://github.com/Selftend/selftend/commit/7ef16418bac04b8c00371c90a5b6ff7c885d4c0a))
* **meditation:** capture the civil day a sit happened on ([#330](https://github.com/Selftend/selftend/issues/330)) ([#416](https://github.com/Selftend/selftend/issues/416)) ([d503e0c](https://github.com/Selftend/selftend/commit/d503e0cb621033fc83b02540e3820dbd00784ee7))
* **meditation:** meditation home joins the iris room ([#339](https://github.com/Selftend/selftend/issues/339)) ([#363](https://github.com/Selftend/selftend/issues/363)) ([5549d73](https://github.com/Selftend/selftend/commit/5549d737faa2860714298e30363d89978d711035))
* **meditation:** the history surfaces join the iris room ([#342](https://github.com/Selftend/selftend/issues/342)) ([#390](https://github.com/Selftend/selftend/issues/390)) ([41311bb](https://github.com/Selftend/selftend/commit/41311bb666f584d9ed349ecb00f76f82d2cb5889))
* **meditation:** the learn surfaces join the iris room ([#341](https://github.com/Selftend/selftend/issues/341)) ([#394](https://github.com/Selftend/selftend/issues/394)) ([bad8101](https://github.com/Selftend/selftend/commit/bad8101ad2a28add733a04386b3b12713902872c))
* **meditation:** the session log editor joins the iris room ([#340](https://github.com/Selftend/selftend/issues/340)) ([#370](https://github.com/Selftend/selftend/issues/370)) ([8fec4c9](https://github.com/Selftend/selftend/commit/8fec4c9485d2d8636b23cd13bb6937863b3defdd))
* **mood:** all-time heatmap section on the be ramp ([#249](https://github.com/Selftend/selftend/issues/249)) ([ccfe4a8](https://github.com/Selftend/selftend/commit/ccfe4a82a271e2dd8f230729fcedd9b324fee759)), closes [#240](https://github.com/Selftend/selftend/issues/240)
* **mood:** bucket mood by the civil day it was captured on ([#250](https://github.com/Selftend/selftend/issues/250)) ([#328](https://github.com/Selftend/selftend/issues/328)) ([678664d](https://github.com/Selftend/selftend/commit/678664d266b77e67f57021a61f09105b79c0b932))
* **mood:** editor and detail join the rose room; score tones on the be ramp ([#252](https://github.com/Selftend/selftend/issues/252)) ([57be160](https://github.com/Selftend/selftend/commit/57be160cfe1ab94f28035c493287132336575a2c))
* **mood:** field/sheet primitives; mood tracker becomes the rose room ([#251](https://github.com/Selftend/selftend/issues/251)) ([2ae51a0](https://github.com/Selftend/selftend/commit/2ae51a0834132188e09fc220f061338cc35661d7))
* **mood:** trend ranges 7/30/90/custom with DateRangeField ([#248](https://github.com/Selftend/selftend/issues/248)) ([59b0ba1](https://github.com/Selftend/selftend/commit/59b0ba14c3add86f943c4e27eecf754092c171c5))
* **mood:** week strip of faces replaces the Mood-by-day bars ([#247](https://github.com/Selftend/selftend/issues/247)) ([447186c](https://github.com/Selftend/selftend/commit/447186c8344195a19eed4fd3669905d328d122ff))
* **release:** release Android to the Play production track automatically on merge to main ([#379](https://github.com/Selftend/selftend/issues/379)) ([b3385d4](https://github.com/Selftend/selftend/commit/b3385d4ad35524f9e68b876e65493ad5a0530e7a))
* **sleep:** detail joins the ink room; quality circle on the ramp ([#265](https://github.com/Selftend/selftend/issues/265)) ([52328f9](https://github.com/Selftend/selftend/commit/52328f9de6901ed4bf459560322ea10c948f8c32))
* **sleep:** editor joins the ink room; create mode gets the field ([#263](https://github.com/Selftend/selftend/issues/263)) ([490ace4](https://github.com/Selftend/selftend/commit/490ace4a434c6af6c77922c58061da96e8e472c1))
* **sleep:** landing becomes the ink room — field, sheet, soft cards, last-logged subline ([#262](https://github.com/Selftend/selftend/issues/262)) ([82f2234](https://github.com/Selftend/selftend/commit/82f2234e3631ce646b5bdc4f5ea9e6f80684232f))
* **tokens:** per-hue field-stop overrides; think joins the AA floors ([#272](https://github.com/Selftend/selftend/issues/272)) ([14dc782](https://github.com/Selftend/selftend/commit/14dc7828e492da7e9e456789bf5c8a01f4d4ffba))
* **tokens:** shared 5-step hue ramp classes; mood and sleep tones unify ([#261](https://github.com/Selftend/selftend/issues/261)) ([bb7512f](https://github.com/Selftend/selftend/commit/bb7512f133f15f3821ae9883ef67e37f86686f6e))


### Bug Fixes

* **a11y:** decide a tint's mark colour by measurement, not by docstring ([#433](https://github.com/Selftend/selftend/issues/433)) ([#439](https://github.com/Selftend/selftend/issues/439)) ([088ff36](https://github.com/Selftend/selftend/commit/088ff36fc0c2432262386c199b8c6cff3462e875))
* **a11y:** give every hue legible ink, and gate the call sites that use it ([#368](https://github.com/Selftend/selftend/issues/368), [#403](https://github.com/Selftend/selftend/issues/403)) ([#399](https://github.com/Selftend/selftend/issues/399)) ([538e2f2](https://github.com/Selftend/selftend/commit/538e2f27fe11386ff1f5e36ab428209566595943))
* **a11y:** give the app accent an ink, so the Beta chip stops failing AA ([#421](https://github.com/Selftend/selftend/issues/421)) ([#430](https://github.com/Selftend/selftend/issues/430)) ([0b5fa22](https://github.com/Selftend/selftend/commit/0b5fa227a4328611ef160841090ea411b0dbc0e6))
* **a11y:** give tinted text its ink, and teach the gate the spelling it missed ([#421](https://github.com/Selftend/selftend/issues/421)) ([#422](https://github.com/Selftend/selftend/issues/422)) ([66f7753](https://github.com/Selftend/selftend/commit/66f7753db56885ced30eb1a2405aa3a583c73610))
* **breathing:** pacer circle reaches aqua through hueHsl, not a literal ([#319](https://github.com/Selftend/selftend/issues/319)) ([a497b93](https://github.com/Selftend/selftend/commit/a497b93428473f8d3cae257d3c931250d3fabc01)), closes [#308](https://github.com/Selftend/selftend/issues/308)
* **cbt:** bucket the last three programme legs by their captured day ([#425](https://github.com/Selftend/selftend/issues/425)) ([#437](https://github.com/Selftend/selftend/issues/437)) ([1eba2fe](https://github.com/Selftend/selftend/commit/1eba2fe42c32a3ecf5b55fb9a849dba6bad10661))
* **ci:** pin supabase/setup-cli to a concrete version instead of latest ([#321](https://github.com/Selftend/selftend/issues/321)) ([6b9a7bf](https://github.com/Selftend/selftend/commit/6b9a7bfdf10655027b3b8a5817004fb7745919af))
* **day-key:** label captured-day surfaces from dayKey and read the captured offset everywhere it exists ([#448](https://github.com/Selftend/selftend/issues/448)) ([1bd8995](https://github.com/Selftend/selftend/commit/1bd899535d8222b1ec11aa63ae18202ab36e5a58))
* **db:** stop a 14-digit migration hiding its 8-digit same-day sibling from db push ([#432](https://github.com/Selftend/selftend/issues/432)) ([#438](https://github.com/Selftend/selftend/issues/438)) ([65d0e9c](https://github.com/Selftend/selftend/commit/65d0e9c61578ead48d665f39c0ae075bbbdfae58))
* **export:** put eleven columns of the user's own data into the GDPR export ([#429](https://github.com/Selftend/selftend/issues/429)) ([#435](https://github.com/Selftend/selftend/issues/435)) ([fb7ccc3](https://github.com/Selftend/selftend/commit/fb7ccc325fc752db4fbc96abf12dead5dedae4fb))
* **export:** put the activity occurrence offsets back into the GDPR export ([#330](https://github.com/Selftend/selftend/issues/330)) ([#431](https://github.com/Selftend/selftend/issues/431)) ([1b69a68](https://github.com/Selftend/selftend/commit/1b69a68bc0d874a4a25cb0287b07d3d12dd92d3e))
* **home:** bucket the programme widget's mood check by its captured day ([#414](https://github.com/Selftend/selftend/issues/414)) ([#419](https://github.com/Selftend/selftend/issues/419)) ([0c664ec](https://github.com/Selftend/selftend/commit/0c664ec66b1cf28089b3c38d0b6ebcdf9894b672))
* **home:** derive the journal-week stats from exact lifetime totals ([#323](https://github.com/Selftend/selftend/issues/323)) ([#392](https://github.com/Selftend/selftend/issues/392)) ([9bbea02](https://github.com/Selftend/selftend/commit/9bbea02512db7fd59ec90bfab60b26cef441ac6c))
* **journal:** count lifetime words server-side so the hero stat stops truncating at 50 entries ([#322](https://github.com/Selftend/selftend/issues/322)) ([ca9445b](https://github.com/Selftend/selftend/commit/ca9445bb8f1ca3e8d4be342013e042728e75d5f1))
* **meditation:** take the lifetime median sit length server-side ([#337](https://github.com/Selftend/selftend/issues/337)) ([#400](https://github.com/Selftend/selftend/issues/400)) ([49d37c3](https://github.com/Selftend/selftend/commit/49d37c3e686077eb6847c0894003cabb90d89e66))
* **occurrence:** make the captured UTC offset nullable so "unknown" is sayable ([#250](https://github.com/Selftend/selftend/issues/250)) ([#326](https://github.com/Selftend/selftend/issues/326)) ([af1d080](https://github.com/Selftend/selftend/commit/af1d080292abf8e8e14a2095c90f3b8acc228de8))
* **release:** fail closed when the mirror target track cannot be read ([#454](https://github.com/Selftend/selftend/issues/454)) ([030387c](https://github.com/Selftend/selftend/commit/030387c26fc5c696e5157992079f716d36c00f63))
* **rooms:** omit the last-logged subline until history has actually loaded ([#320](https://github.com/Selftend/selftend/issues/320)) ([#367](https://github.com/Selftend/selftend/issues/367)) ([a1641d3](https://github.com/Selftend/selftend/commit/a1641d3fa2b05571d5b19e55a70bfa9395629f83))
* **routines:** read the captured day for the four migrated tools ([#330](https://github.com/Selftend/selftend/issues/330)) ([#401](https://github.com/Selftend/selftend/issues/401)) ([8fca1ce](https://github.com/Selftend/selftend/commit/8fca1ce9d5a64c9e52597dcf375d068474bbea97))
* **sleep:** derive the tracker's summary stats server-side ([#256](https://github.com/Selftend/selftend/issues/256)) ([#420](https://github.com/Selftend/selftend/issues/420)) ([734827b](https://github.com/Selftend/selftend/commit/734827b5c929fa66ab4f7140f09a690cef9d561a))
* **theme:** let a fresh theme choice outlast a stored value ([#358](https://github.com/Selftend/selftend/issues/358)) ([#365](https://github.com/Selftend/selftend/issues/365)) ([9f84b46](https://github.com/Selftend/selftend/commit/9f84b46cdc962d85632ec66d963f4f7bd4c4476f))
* **tools:** render the hub in each tool's own hue, from tool-accent.ts ([#421](https://github.com/Selftend/selftend/issues/421)) ([#428](https://github.com/Selftend/selftend/issues/428)) ([da768e8](https://github.com/Selftend/selftend/commit/da768e85276bcafebf1912bf5e668f645fd87925))
* **ui:** list breathing and meditation on the tools hub, wrap the sign-out button, drop seconds from the defusion log ([#452](https://github.com/Selftend/selftend/issues/452)) ([edcdcc2](https://github.com/Selftend/selftend/commit/edcdcc22e13b6f87f27be38e6b097290326aac50))
* **web:** cache the hashed Expo bundles immutably, drop the no-op index.html rule ([#393](https://github.com/Selftend/selftend/issues/393)) ([#396](https://github.com/Selftend/selftend/issues/396)) ([d059756](https://github.com/Selftend/selftend/commit/d0597562d8e0a366c1edc70849ed93e624f935c0))

## [0.6.1](https://github.com/Selftend/selftend/compare/v0.6.0...v0.6.1) (2026-07-24)


### Bug Fixes

* **auth:** add Play App Signing fingerprint to assetlinks.json ([#210](https://github.com/Selftend/selftend/issues/210)) ([ae71558](https://github.com/Selftend/selftend/commit/ae71558fdac68f12c4a5a4f05114b72787fc0d8f))
* **auth:** gate email-link token use behind a human click to survive mail scanners ([#211](https://github.com/Selftend/selftend/issues/211)) ([4e53a3b](https://github.com/Selftend/selftend/commit/4e53a3bd819ef6872582c49249ed7a35a36cebab))

## [0.6.0](https://github.com/Selftend/selftend/compare/v0.5.0...v0.6.0) (2026-07-23)


### Features

* **auth:** verified Android App Links for email-auth callback handoff ([#205](https://github.com/Selftend/selftend/issues/205)) ([b8e8635](https://github.com/Selftend/selftend/commit/b8e86354dceba9d1b20e8e700cba0a53c22d4275)), closes [#183](https://github.com/Selftend/selftend/issues/183)
* **landing:** redesign web home page to match new hero design ([#202](https://github.com/Selftend/selftend/issues/202)) ([c26807b](https://github.com/Selftend/selftend/commit/c26807b6f931ae0f21d714482c09995bbe0c7702))
* **policies:** clear launch-review banner after final legal review ([#200](https://github.com/Selftend/selftend/issues/200)) ([25127e4](https://github.com/Selftend/selftend/commit/25127e4641deb1bf55277a74cb7e513d297a1169)), closes [#198](https://github.com/Selftend/selftend/issues/198)


### Bug Fixes

* **sortables:** stop CustomHandle passing SyntheticEvent into runOnUI ([#203](https://github.com/Selftend/selftend/issues/203)) ([d7e1028](https://github.com/Selftend/selftend/commit/d7e1028056b2a6fe9e04e4804789e3dd60473149)), closes [#199](https://github.com/Selftend/selftend/issues/199)

## [0.5.0](https://github.com/Selftend/selftend/compare/v0.4.2...v0.5.0) (2026-07-22)


### Features

* **edge:** send feedback email via AWS SES instead of Resend ([#146](https://github.com/Selftend/selftend/issues/146)) ([f4790bb](https://github.com/Selftend/selftend/commit/f4790bb973651efe84381d28085148be3fa592f7))
* **platform:** upgrade Expo SDK 54→55 (RN 0.83, React 19.2), expo-av→expo-audio ([#160](https://github.com/Selftend/selftend/issues/160)) ([#166](https://github.com/Selftend/selftend/issues/166)) ([321f321](https://github.com/Selftend/selftend/commit/321f32119025649fb61ec04669cd2574f6538a23))
* **platform:** upgrade Expo SDK 55→56 — RN 0.85, Hermes V1 default, expo-router navigation independence ([#168](https://github.com/Selftend/selftend/issues/168)) ([57193c0](https://github.com/Selftend/selftend/commit/57193c0fa6b1c194aee17bd9e4c13ab495d4f5be))
* **platform:** upgrade Expo SDK 56→57 — land the spine target ([#162](https://github.com/Selftend/selftend/issues/162)) ([#169](https://github.com/Selftend/selftend/issues/169)) ([553b4b8](https://github.com/Selftend/selftend/commit/553b4b87c936dab1d4a39b622e2e48822e4383cd))


### Bug Fixes

* **auth:** base email links on SiteURL so native-initiated emails work ([#179](https://github.com/Selftend/selftend/issues/179)) ([5831572](https://github.com/Selftend/selftend/commit/5831572edbcc2d0ecdca388871e0ea9229a88b59))
* **consent:** don't flash the policy gate when the preferences fetch fails ([#170](https://github.com/Selftend/selftend/issues/170)) ([91a9f8a](https://github.com/Selftend/selftend/commit/91a9f8a657cc8572b78266f55228268fea4de969))
* **home:** rework dashboard grid to Sortable.Grid so columns never collapse ([#180](https://github.com/Selftend/selftend/issues/180)) ([b2de787](https://github.com/Selftend/selftend/commit/b2de787804f81d3718e3b400cc54e76dc093bfd8))
* **keyboard:** restore Android keyboard avoidance lost to edge-to-edge ([#181](https://github.com/Selftend/selftend/issues/181)) ([302bbe5](https://github.com/Selftend/selftend/commit/302bbe5bb4ee15deb006149b3ae789313efad7ef))
* **security:** post-launch advisor + defense-in-depth hardening ([#138](https://github.com/Selftend/selftend/issues/138)) ([#147](https://github.com/Selftend/selftend/issues/147)) ([89d069f](https://github.com/Selftend/selftend/commit/89d069fb68f63e8209e491a44841e6dd12d48c4f))

## [0.4.2](https://github.com/Selftend/selftend/compare/v0.4.1...v0.4.2) (2026-07-18)


### Miscellaneous Chores

* release selftend 0.4.2 ([#143](https://github.com/Selftend/selftend/issues/143)) ([87f59da](https://github.com/Selftend/selftend/commit/87f59da1758f55f34c2e1c323dca13557c65a832))

## [0.4.1](https://github.com/Selftend/selftend/compare/v0.4.0...v0.4.1) (2026-07-18)


### Bug Fixes

* **deps:** override transitive uuid@7 to 11.1.1 (Dependabot alert 10) ([#129](https://github.com/Selftend/selftend/issues/129)) ([3138abe](https://github.com/Selftend/selftend/commit/3138abe027b3d61161bf1652cbaaa8e208693feb))
* run wrangler on Node 22 so _headers applies ([#132](https://github.com/Selftend/selftend/issues/132)) ([779546f](https://github.com/Selftend/selftend/commit/779546ff2728b71523f0fbf1dabefea472629d48))

## [0.4.0](https://github.com/Selftend/selftend/compare/v0.3.3...v0.4.0) (2026-07-16)


### Features

* **reminders:** suppress routine reminders on unscheduled days ([#113](https://github.com/Selftend/selftend/issues/113)) ([#116](https://github.com/Selftend/selftend/issues/116)) ([8906a84](https://github.com/Selftend/selftend/commit/8906a84334df24a39a9bae4b34057f1afd91e5ae))
* **routines:** admit all loggable CBT/ACT tools as steps; grouped Add-step picker ([#123](https://github.com/Selftend/selftend/issues/123)) ([#124](https://github.com/Selftend/selftend/issues/124)) ([d35e0a1](https://github.com/Selftend/selftend/commit/d35e0a176aa7e7e138d0666328ea1b612a9dc53c))
* **routines:** cadence + custom_days schema and data layer ([#103](https://github.com/Selftend/selftend/issues/103)) ([#114](https://github.com/Selftend/selftend/issues/114)) ([a314fde](https://github.com/Selftend/selftend/commit/a314fdeceba3644bd84b635d2f2df197d079a356))
* **routines:** calm schedule labels and muted off-day strip dots ([#106](https://github.com/Selftend/selftend/issues/106)) ([#117](https://github.com/Selftend/selftend/issues/117)) ([19f2db3](https://github.com/Selftend/selftend/commit/19f2db33833e15ee602e4327eb518c4d6da30780))
* **routines:** DB schema, RLS, encryption & export migration (retire plan_items) ([#77](https://github.com/Selftend/selftend/issues/77)) ([6230698](https://github.com/Selftend/selftend/commit/6230698184151666198657b901667d0780347c60))
* **routines:** editor Days section with cadence chips ([#105](https://github.com/Selftend/selftend/issues/105)) ([#119](https://github.com/Selftend/selftend/issues/119)) ([ac4784a](https://github.com/Selftend/selftend/commit/ac4784a6433d2e4b340ed69fc57f8b89980397cb))
* **routines:** FAB follows the in-progress routine and shows the queued count ([#121](https://github.com/Selftend/selftend/issues/121)) ([#122](https://github.com/Selftend/selftend/issues/122)) ([f2f0f91](https://github.com/Selftend/selftend/commit/f2f0f911c4ee5e0dca7a5b154f5548ac269d1014))
* **routines:** Home integration - routines-today widget, routine FAB, continue-sheet ([#50](https://github.com/Selftend/selftend/issues/50)) ([#83](https://github.com/Selftend/selftend/issues/83)) ([f1b1d7e](https://github.com/Selftend/selftend/commit/f1b1d7e1b34c2493d860c85ca7b4cd5e145a9147))
* **routines:** last-7-days no-streak dot strip on cards & detail ([#49](https://github.com/Selftend/selftend/issues/49)) ([#81](https://github.com/Selftend/selftend/issues/81)) ([b56c10e](https://github.com/Selftend/selftend/commit/b56c10e3857a2f6ccaaf0d403b2c5db63eb4ddfe))
* **routines:** management screens, editor & navigation (list -&gt; detail -&gt; editor) ([#45](https://github.com/Selftend/selftend/issues/45)) ([#79](https://github.com/Selftend/selftend/issues/79)) ([480d2a3](https://github.com/Selftend/selftend/commit/480d2a38ac785dded31d26e3236146c3d1931b96))
* **routines:** onboarding starter-routine panel — offer, never auto-create ([#46](https://github.com/Selftend/selftend/issues/46)) ([#82](https://github.com/Selftend/selftend/issues/82)) ([ec1c923](https://github.com/Selftend/selftend/commit/ec1c923b62d12dff435d70e8110769146ced990f))
* **routines:** pure deriveRoutine/stepDoneOnDate status-derivation engine ([#40](https://github.com/Selftend/selftend/issues/40)) ([#76](https://github.com/Selftend/selftend/issues/76)) ([58cb397](https://github.com/Selftend/selftend/commit/58cb3972b9bb8c4321b40b334e3a336192ea6b1d))
* **routines:** repository + queries data layer ([#78](https://github.com/Selftend/selftend/issues/78)) ([f4d9043](https://github.com/Selftend/selftend/commit/f4d9043f35f0d567e05bab0e0d4a6e80e2870fa6))
* **routines:** routine-level reminders — editor opt-in, push fan-out, overlap note ([#47](https://github.com/Selftend/selftend/issues/47)) ([#84](https://github.com/Selftend/selftend/issues/84)) ([fe7bda9](https://github.com/Selftend/selftend/commit/fe7bda932d54baee5041f6abafa62a9012be0bab))
* **routines:** surface scheduled-today routines only ([#104](https://github.com/Selftend/selftend/issues/104)) ([#118](https://github.com/Selftend/selftend/issues/118)) ([57fcb6c](https://github.com/Selftend/selftend/commit/57fcb6c34744541cb04a916383312cedee0da4af))


### Bug Fixes

* **app:** keep the FAB off form screens; move community links per breakpoint ([#90](https://github.com/Selftend/selftend/issues/90), [#92](https://github.com/Selftend/selftend/issues/92)) ([#94](https://github.com/Selftend/selftend/issues/94)) ([0fc0a28](https://github.com/Selftend/selftend/commit/0fc0a28a152d7dd1e07e65cbb8ba3f2c832d576b))
* **header:** constrain the home-link hit area to the logo and name ([#100](https://github.com/Selftend/selftend/issues/100)) ([0870f2f](https://github.com/Selftend/selftend/commit/0870f2ff16ab91dc44c8f8a9babc6a8b9331f0eb))
* **routines:** FAB counts the first open routine and fades out on completion ([#91](https://github.com/Selftend/selftend/issues/91)) ([#99](https://github.com/Selftend/selftend/issues/99)) ([4fd7c4c](https://github.com/Selftend/selftend/commit/4fd7c4cd42c64ff799b7a3b351e3391c42368e2b))

## [0.3.3](https://github.com/Selftend/selftend/compare/v0.3.2...v0.3.3) (2026-07-15)


### Bug Fixes

* **settings:** write only patched preference columns - end the whole-row lost-update ([#57](https://github.com/Selftend/selftend/issues/57)) ([#68](https://github.com/Selftend/selftend/issues/68)) ([d946dd1](https://github.com/Selftend/selftend/commit/d946dd102c9eda0669bee1a8e44b0a98d4e85503))

## [0.3.2](https://github.com/Selftend/selftend/compare/v0.3.1...v0.3.2) (2026-07-15)


### Bug Fixes

* **e2e:** deflake time/UTC seeds, mood-list race, reminder-prompt interference; add local runner ([#56](https://github.com/Selftend/selftend/issues/56)) ([daf6963](https://github.com/Selftend/selftend/commit/daf69639d955b5ec105e07353aca0f629de3b1d0))

## [0.3.1](https://github.com/Selftend/selftend/compare/v0.3.0...v0.3.1) (2026-07-14)


### Bug Fixes

* **overlays:** pass pointerEvents box-none as prop so overlays don't swallow taps ([#36](https://github.com/Selftend/selftend/issues/36)) ([a4d8e9e](https://github.com/Selftend/selftend/commit/a4d8e9e78681d091a589e95d5959bf7d9d02d5f1))

## [0.3.0](https://github.com/Selftend/selftend/compare/v0.2.1...v0.3.0) (2026-07-14)


### Features

* **analytics:** add aggregate engagement report (activation, retention, module adoption) ([0ff68e0](https://github.com/Selftend/selftend/commit/0ff68e0bafcb900d808764ee10731e4a8f6b005f))
* **reminders:** one-time contextual reminder prompt after first tool completion ([ba75b50](https://github.com/Selftend/selftend/commit/ba75b5012effa832d8c82731ef0ef16329cce06a))


### Bug Fixes

* **e2e:** normalize -0 offset in journal occurrence test on UTC runners ([fb2da22](https://github.com/Selftend/selftend/commit/fb2da22eb58b32cefb848e4a8eb33af9eefbd10a))
* **sentry:** remove wizard-injected Sentry.init with PII and session replay ([eb743cb](https://github.com/Selftend/selftend/commit/eb743cbde507be035c494870d5ec41b5b40bdf5b))

## [0.2.1](https://github.com/Selftend/selftend/compare/v0.2.0...v0.2.1) (2026-07-12)


### Bug Fixes

* **deps:** override postcss to ^8.5.10 (resolves GHSA-qx2v-qp2m-jg93 XSS in CSS stringify) ([6b786cc](https://github.com/Selftend/selftend/commit/6b786cc534ebe7dd63903c3beef3eed158cc86d3))

## [0.2.0](https://github.com/Selftend/selftend/compare/v0.1.0...v0.2.0) (2026-07-10)


### ⚠ BREAKING CHANGES

* **widgets:** previously placed launcher widgets are orphaned by the provider swap (pre-release, no external users).

### Features

* **auth:** dedicated /sign-in route and consistent back-to-sign-in targets ([b8cefcc](https://github.com/Selftend/selftend/commit/b8cefccb8841d019444567a152d553e2513b5b21))
* **cbt:** guided new-user flow for the thought record ([058b189](https://github.com/Selftend/selftend/commit/058b18937e554718fa4df358ecef229ff2631d31))
* **community:** dedicated crisis-resources channel for Server Guide resources ([2e6bc93](https://github.com/Selftend/selftend/commit/2e6bc93728d16156104e99e577bfa9c349c0c39e))
* **community:** Discord server buildout - setup script, permanent invite fix, and server docs ([77f4903](https://github.com/Selftend/selftend/commit/77f4903260175a4de8d036f5466101d2327299a5))
* **community:** replace welcome channel with links directory, drop android-testing ([f23f057](https://github.com/Selftend/selftend/commit/f23f057937c0299ad34357eec0c6bb24e796aad2))
* **landing:** landing-page copy (en + bg) ([518dc94](https://github.com/Selftend/selftend/commit/518dc941ddef3a531758d73d802a2e0db314efde))
* **landing:** public web landing page for signed-out visitors ([c11950c](https://github.com/Selftend/selftend/commit/c11950c80b775c64f886b6556a42695779df79d3))
* **modules:** plain-language module glosses, where-to-start line, full-name nav a11y labels ([e64ae45](https://github.com/Selftend/selftend/commit/e64ae45e35fb786847eca99fc6e36301d8b909c6))
* **onboarding:** explain what Selftend is and gloss CBT/ACT in the wizard ([4ccfef2](https://github.com/Selftend/selftend/commit/4ccfef2027189edf828c4194d18f11fa596b5eda))
* **progress:** reachable Progress page with Check-in rename and module counts ([3d5deaa](https://github.com/Selftend/selftend/commit/3d5deaa7cc20d579c6aa5f1f9e41d410c12463e9))
* **safety:** slim crisis bar on exercise forms; keep full callout on module homes ([dd1ea0a](https://github.com/Selftend/selftend/commit/dd1ea0aac1f1aac1e10ec41a4bb39ec8fb017664))
* store links, Discord visibility, and feedback discoverability ([13364fe](https://github.com/Selftend/selftend/commit/13364fe18d5db5be1bd8d1b67361ee05bf5cce01))
* team QA hardening rounds - auth links, carousel, keyboard, a11y, drafts ([9d063fa](https://github.com/Selftend/selftend/commit/9d063fab198dd13f7c9eaa81446da4efd6400294))
* **tours:** trim first-run tips to 3 on the home dashboard; remove per-page coach marks ([cdc9c41](https://github.com/Selftend/selftend/commit/cdc9c41def42a28383e7b7b89f0d4ad8e5f2504e))
* **widgets:** single configurable Selftend launcher widget replaces Mood/Today/Shortcuts ([40d4c5a](https://github.com/Selftend/selftend/commit/40d4c5a1fbf438b1f5ff25af4a5ddd67361877e0))
* **wizard:** collapse the step indicator to one line on narrow screens ([3bad7ab](https://github.com/Selftend/selftend/commit/3bad7ab6301b0087509abec8ba4a233c516ed5a5))


### Bug Fixes

* **auth:** distinguish rate-limited and already-verified resend outcomes ([2200776](https://github.com/Selftend/selftend/commit/2200776a9180a378932aac0adf076f2d6686a1fb))
* **auth:** restyle email templates and remove dead magic-link flow ([5e227a0](https://github.com/Selftend/selftend/commit/5e227a0a2459a1fdc9e9cb4e7499f8ac34df2d62))
* **cbt:** render emotion and pattern display labels instead of stored slugs ([b429993](https://github.com/Selftend/selftend/commit/b429993694e2b3db89365f88f2c9f36977f05c7a))
* **cbt:** restore dispute prompts and retitle distortion guide to "Thinking patterns" ([95558de](https://github.com/Selftend/selftend/commit/95558dea729c68c5bf9c1ba473f44a83fec98e0a))
* **community:** update Discord invite to the current permanent link ([a0e9964](https://github.com/Selftend/selftend/commit/a0e99646a15ef8b3a21cf44bcf66956fe8beecb2))
* **help:** constrain help-sheet width and group sections into readable blocks ([18be1aa](https://github.com/Selftend/selftend/commit/18be1aa0b2c783f7411dbdbf519b90e8721fec6f))
* **landing:** calmer hero copy and preview carousel with correct image framing ([fd91ea8](https://github.com/Selftend/selftend/commit/fd91ea8bdfc0977271a92d7ffb05f96ea364fb52))
* lint scripts with .cjs extension (Buffer global) ([63b80af](https://github.com/Selftend/selftend/commit/63b80af3d09c50bdad8451c5b70c653d427052a5))
* **profile:** use display name for avatar initial and account menu ([4e49b72](https://github.com/Selftend/selftend/commit/4e49b720d4622657bffa86a5b3c03ba78aa13148))
* **tools:** calm, muted empty-state sublines instead of red uppercase ([cbc8fa4](https://github.com/Selftend/selftend/commit/cbc8fa4b9ad3c5d726a8f35fc085a8091d60e5a5))
* **web:** resolve console warnings on load (deprecated RN-Web props) ([138309c](https://github.com/Selftend/selftend/commit/138309c9a5795e4094472ee9f82517f1805e0b85))
* **widgets:** launcher card polish - borderless frame, bottom-anchored CTAs, slider tracking, config safe areas ([e09a407](https://github.com/Selftend/selftend/commit/e09a407648263eb0649e7a922501520d76289009))
