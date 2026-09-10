# Changelog

## [0.19.0](https://github.com/Selftend/selftend/compare/v0.18.0...v0.19.0) (2026-09-10)


### Features

* **web:** every public route owns its head, and the document title follows the H1 everywhere ([#2294](https://github.com/Selftend/selftend/issues/2294)) ([#2300](https://github.com/Selftend/selftend/issues/2300)) ([60ad87d](https://github.com/Selftend/selftend/commit/60ad87d845801a7ae44f6b11552a625d766ba3bc))
* **web:** the index list prunes the export, writes the sitemap, and every other path is a real 404 ([#2295](https://github.com/Selftend/selftend/issues/2295)) ([#2311](https://github.com/Selftend/selftend/issues/2311)) ([7c9fe06](https://github.com/Selftend/selftend/commit/7c9fe0628303dc9ee13afedb42b789baf2a13a02))
* **web:** the landing page says who publishes it, in one structured-data block ([#2296](https://github.com/Selftend/selftend/issues/2296)) ([#2312](https://github.com/Selftend/selftend/issues/2312)) ([71ac85b](https://github.com/Selftend/selftend/commit/71ac85b3449a9564f5606e9e48b35853f23d04eb))
* **web:** the static export, with the landing page complete ([#2293](https://github.com/Selftend/selftend/issues/2293)) ([#2299](https://github.com/Selftend/selftend/issues/2299)) ([1e438dc](https://github.com/Selftend/selftend/commit/1e438dc07cb93cdb61fa3d6874049d159acf782c))

## [0.18.0](https://github.com/Selftend/selftend/compare/v0.17.0...v0.18.0) (2026-09-09)


### Features

* **a11y:** CrisisSupportCallout takes a heading level, and /support + /faq raise it to 2 ([#2137](https://github.com/Selftend/selftend/issues/2137)) ([#2164](https://github.com/Selftend/selftend/issues/2164)) ([949d42e](https://github.com/Selftend/selftend/commit/949d42e00b582eb5fc63cd803e1e44647a4bef95))
* **a11y:** Disclosure becomes a full-width heading row ([#2143](https://github.com/Selftend/selftend/issues/2143)) ([#2156](https://github.com/Selftend/selftend/issues/2156)) ([72e600a](https://github.com/Selftend/selftend/commit/72e600a65b72c90a169ade464a8bb64b7caebf13))
* **a11y:** the crisis callout is a level-2 block on the module homes too ([#2167](https://github.com/Selftend/selftend/issues/2167)) ([#2168](https://github.com/Selftend/selftend/issues/2168)) ([b9f320e](https://github.com/Selftend/selftend/commit/b9f320e497a0b16a37e0afe9d2141934e9ba8df4))
* **a11y:** the parents' letter gets its five sub-heads ([#2149](https://github.com/Selftend/selftend/issues/2149)) ([#2161](https://github.com/Selftend/selftend/issues/2161)) ([6944416](https://github.com/Selftend/selftend/commit/6944416316a17ba3f71afb5cd8320e41c226c999))
* **a11y:** the underage-report route gets its own sub-head in the parents' letter ([#2162](https://github.com/Selftend/selftend/issues/2162)) ([41dadaa](https://github.com/Selftend/selftend/commit/41dadaaa912cd7517a04c81c2be000676f589070))
* **act:** a help door in each ACT process list-screen header ([#1549](https://github.com/Selftend/selftend/issues/1549)) ([d8656e1](https://github.com/Selftend/selftend/commit/d8656e1223a192d544c77c288cb828d86d4b265f))
* **act:** archive rows read compact, detail screens absolute ([#1558](https://github.com/Selftend/selftend/issues/1558)) ([bfd09df](https://github.com/Selftend/selftend/commit/bfd09dff8e712a55d04f5f16765e1617ae312669))
* **act:** every ACT record type gets a reachable archive ([#1552](https://github.com/Selftend/selftend/issues/1552)) ([ca9b662](https://github.com/Selftend/selftend/commit/ca9b6628ecd8613cb1a44d32dda03f126034d5f0)), closes [#1517](https://github.com/Selftend/selftend/issues/1517)
* **analytics:** retention gets a concern axis, and every report gets a guest axis ([#1613](https://github.com/Selftend/selftend/issues/1613)) ([#1649](https://github.com/Selftend/selftend/issues/1649)) ([8e3e4c9](https://github.com/Selftend/selftend/commit/8e3e4c9e353ed7920a96f0f9f33083ff2e7adeef))
* **audio:** an opt-in tap for each meditation bell and each breath phase, off by default ([#1741](https://github.com/Selftend/selftend/issues/1741)) ([#1754](https://github.com/Selftend/selftend/issues/1754)) ([961d777](https://github.com/Selftend/selftend/commit/961d777db2cdffed38cdeb95bc8b2a754bb26dbb))
* **audio:** nine background beds, a fixed loudness gate, and the app plays them ([#1130](https://github.com/Selftend/selftend/issues/1130)) ([#1569](https://github.com/Selftend/selftend/issues/1569)) ([65b823d](https://github.com/Selftend/selftend/commit/65b823d4e38b07c133cbbd389750759e54d37158))
* **audio:** the render pipeline speaks two languages ([#1578](https://github.com/Selftend/selftend/issues/1578)) ([#1584](https://github.com/Selftend/selftend/issues/1584)) ([9a7d7d5](https://github.com/Selftend/selftend/commit/9a7d7d5c44ce8d2f3c9f133673214415c00dea60))
* **auth:** a guest's Sign in door in the header menu ([#1869](https://github.com/Selftend/selftend/issues/1869)) ([#1895](https://github.com/Selftend/selftend/issues/1895)) ([73a854a](https://github.com/Selftend/selftend/commit/73a854a4e39379b4eb671bc329e058e079ba240f))
* **auth:** the Art. 9 consent becomes its own act, asked of everyone ([#1766](https://github.com/Selftend/selftend/issues/1766)) ([#1858](https://github.com/Selftend/selftend/issues/1858)) ([ffc0df1](https://github.com/Selftend/selftend/commit/ffc0df149e7d7c3bf846985516d16f8ec68975e4))
* **auth:** the neutral age and country gate, on every entry path ([#1764](https://github.com/Selftend/selftend/issues/1764)) ([#1806](https://github.com/Selftend/selftend/issues/1806)) ([fd49def](https://github.com/Selftend/selftend/commit/fd49def87c4f591d50ced68f692661f99c5b354d))
* **auth:** the per-country age floor, and the check that reads it ([#1761](https://github.com/Selftend/selftend/issues/1761)) ([#1773](https://github.com/Selftend/selftend/issues/1773)) ([cac547f](https://github.com/Selftend/selftend/commit/cac547faa4d735536f1d3d9f2026fb8a7ce3119d))
* **auth:** the under-floor exit erases the account and blocks the device ([#1765](https://github.com/Selftend/selftend/issues/1765)) ([#1821](https://github.com/Selftend/selftend/issues/1821)) ([db30794](https://github.com/Selftend/selftend/commit/db3079419d805aba2758315135a20f9ef4ea82bb))
* **auth:** user_preferences remembers the age gate's verdict, never the birth date ([#1762](https://github.com/Selftend/selftend/issues/1762)) ([#1797](https://github.com/Selftend/selftend/issues/1797)) ([4cfa2cf](https://github.com/Selftend/selftend/commit/4cfa2cf6a2a8de7c520b5ffbd39a7c1f2e60d872))
* **breathing:** the ambient bed fades in and out instead of cutting dead ([#1743](https://github.com/Selftend/selftend/issues/1743)) ([#1751](https://github.com/Selftend/selftend/issues/1751)) ([b4433af](https://github.com/Selftend/selftend/commit/b4433af30faea85d26baccc19382f141a24693ea))
* **breathing:** the voice cues are real, and the male voice becomes reachable ([#1130](https://github.com/Selftend/selftend/issues/1130)) ([#1572](https://github.com/Selftend/selftend/issues/1572)) ([5ede2c4](https://github.com/Selftend/selftend/commit/5ede2c4722f058c28ba0f21dafc34d0f7cbfae5d))
* **cbt:** the assessment week leads with the active practice ([#1676](https://github.com/Selftend/selftend/issues/1676)) ([#1680](https://github.com/Selftend/selftend/issues/1680)) ([654a26f](https://github.com/Selftend/selftend/commit/654a26fad95c167332b11dcc4ddbc695ecc65f13))
* **cbt:** the Learn surface teaches pace and mode, and the FAQ answers over-use ([#1671](https://github.com/Selftend/selftend/issues/1671)) ([#1684](https://github.com/Selftend/selftend/issues/1684)) ([1e3ba33](https://github.com/Selftend/selftend/commit/1e3ba33a3b16aa96ed9399c3d3758e7a8d26477a))
* **db:** a favorites table, the 25→11 copy migration, export and seeds ([#1953](https://github.com/Selftend/selftend/issues/1953)) ([#1962](https://github.com/Selftend/selftend/issues/1962)) ([44b5f21](https://github.com/Selftend/selftend/commit/44b5f2148af5769a3cb19b1739388394c696e0a6))
* **dbt:** opposite action and the interpersonal script ([#1980](https://github.com/Selftend/selftend/issues/1980)) ([#2031](https://github.com/Selftend/selftend/issues/2031)) ([0efb12e](https://github.com/Selftend/selftend/commit/0efb12e4624b99f963417c99004c8825963043ae))
* **dbt:** routines, the starter offer, the demo seed, the reports and the docs ([#1980](https://github.com/Selftend/selftend/issues/1980)) ([#2033](https://github.com/Selftend/selftend/issues/2033)) ([a4236b5](https://github.com/Selftend/selftend/commit/a4236b5ad73cc7b6867e614a77d8140a757411c2))
* **dbt:** the coping plan, its card, and Pause and choose ([#1980](https://github.com/Selftend/selftend/issues/1980)) ([#2027](https://github.com/Selftend/selftend/issues/2027)) ([8542b26](https://github.com/Selftend/selftend/commit/8542b264fadf59d1950fee6f2c9ea93ba130c6bf))
* **dbt:** the data layer - seven born-encrypted tables, preferences, record_days, export ([#1980](https://github.com/Selftend/selftend/issues/1980)) ([#2024](https://github.com/Selftend/selftend/issues/2024)) ([dcc8a79](https://github.com/Selftend/selftend/commit/dcc8a798f9ae9544188d89bfa9e1f2e231b7c53b))
* **dbt:** the emotion record - one feeling from what happened to what came after ([#1980](https://github.com/Selftend/selftend/issues/1980)) ([#2029](https://github.com/Selftend/selftend/issues/2029)) ([e543b08](https://github.com/Selftend/selftend/commit/e543b08520e3554bf61b0b7dbb559b326e203f88))
* **dbt:** the module home, the learn primer and four skill-group pages ([#1980](https://github.com/Selftend/selftend/issues/1980)) ([#2026](https://github.com/Selftend/selftend/issues/2026)) ([a10a581](https://github.com/Selftend/selftend/commit/a10a581eb455918737eff9192930bf3278a51852))
* **dbt:** the muscle relaxation session, the module's first timed practice ([#1980](https://github.com/Selftend/selftend/issues/1980)) ([#2028](https://github.com/Selftend/selftend/issues/2028)) ([ca72f87](https://github.com/Selftend/selftend/commit/ca72f87f85d1fed7d6fe64146af079d67e151413))
* **dbt:** the programme, its graduation, and the module's one reminder ([#1980](https://github.com/Selftend/selftend/issues/1980)) ([#2032](https://github.com/Selftend/selftend/issues/2032)) ([4cfcab2](https://github.com/Selftend/selftend/commit/4cfcab25ff74d86731611724ca279cfe0151cc8d))
* **dbt:** the wise mind check-in and the judgement record ([#1980](https://github.com/Selftend/selftend/issues/1980)) ([#2030](https://github.com/Selftend/selftend/issues/2030)) ([0cf32f7](https://github.com/Selftend/selftend/commit/0cf32f79f67c18fadeeacf68e6d7697d4925689a))
* **donate:** the donation path is wired — a Donate row, the Sponsor button, and present-tense policy copy ([#1711](https://github.com/Selftend/selftend/issues/1711)) ([#1720](https://github.com/Selftend/selftend/issues/1720)) ([c29d52b](https://github.com/Selftend/selftend/commit/c29d52b7dc199601f14b5af9819618d01cddcf61))
* **grounding:** cold-water technique carries its medical caution inline ([#1996](https://github.com/Selftend/selftend/issues/1996)) ([#2014](https://github.com/Selftend/selftend/issues/2014)) ([2cb062a](https://github.com/Selftend/selftend/commit/2cb062a95458226d0483f9975271a524b2edc287))
* **home:** one card with a star, and Home becomes Favourites, Tools, Modules ([#1955](https://github.com/Selftend/selftend/issues/1955), [#1956](https://github.com/Selftend/selftend/issues/1956)) ([#1968](https://github.com/Selftend/selftend/issues/1968)) ([ae9269f](https://github.com/Selftend/selftend/commit/ae9269f89fe735d99d54fc3012bb88bd577922af))
* **home:** the arrange catalogue groups into Tools, CBT and ACT ([#1793](https://github.com/Selftend/selftend/issues/1793)) ([704db8e](https://github.com/Selftend/selftend/commit/704db8e9728c2040ff398c21ff6062bd3379fec1))
* **home:** the skip-path empty state opens a first tool ([#1675](https://github.com/Selftend/selftend/issues/1675)) ([#1679](https://github.com/Selftend/selftend/issues/1679)) ([d7f2378](https://github.com/Selftend/selftend/commit/d7f2378e5cfb67736bf626e5435d298c60fb39b9))
* **landing:** the subreddit closes the landing footer beside Discord ([#2130](https://github.com/Selftend/selftend/issues/2130)) ([1f6ce23](https://github.com/Selftend/selftend/commit/1f6ce2399031ed8015abc9813104d38faf6a6d87))
* **links:** the store links default to the live listings, so every build points at a real app ([#1776](https://github.com/Selftend/selftend/issues/1776)) ([#1777](https://github.com/Selftend/selftend/issues/1777)) ([c44247e](https://github.com/Selftend/selftend/commit/c44247e379af02a217f249600faf75b651493bfa))
* **meditation:** the sit gets an ambient bed picker beside the bell volume ([#1742](https://github.com/Selftend/selftend/issues/1742)) ([#1752](https://github.com/Selftend/selftend/issues/1752)) ([32d6bcf](https://github.com/Selftend/selftend/commit/32d6bcf121196896d88550ae61ce9adc0b5ad0be))
* **nav:** /tools and /modules stop being pages ([#2114](https://github.com/Selftend/selftend/issues/2114)) ([#2135](https://github.com/Selftend/selftend/issues/2135)) ([4197cdd](https://github.com/Selftend/selftend/commit/4197cdd9fe132b962fd7acd04a1fb6e488ebdf67))
* **nav:** a tool home is its own top crumb ([#2113](https://github.com/Selftend/selftend/issues/2113)) ([#2120](https://github.com/Selftend/selftend/issues/2120)) ([e0f9696](https://github.com/Selftend/selftend/commit/e0f96964a29506f2b7e74c02f6dc8ba1acc477f6))
* **nav:** each sidebar group ends in a row that opens its hub ([#1841](https://github.com/Selftend/selftend/issues/1841)) ([#2078](https://github.com/Selftend/selftend/issues/2078)) ([11667cb](https://github.com/Selftend/selftend/commit/11667cb53952446ff8810f06774fe637bdb82498))
* **nav:** the panel is seven rows, and the catalogue leaves it ([#2106](https://github.com/Selftend/selftend/issues/2106)) ([#2115](https://github.com/Selftend/selftend/issues/2115)) ([9551f4d](https://github.com/Selftend/selftend/commit/9551f4da6077acdbd3d432d6097bbae5f00edcdf))
* **onboarding:** concern-at-intake is recorded immutably ([#1612](https://github.com/Selftend/selftend/issues/1612)) ([#1647](https://github.com/Selftend/selftend/issues/1647)) ([4edaafe](https://github.com/Selftend/selftend/commit/4edaafe18462b342f80cf76c71a2869cb17f1d9a))
* **onboarding:** one welcome panel; drop selected_concerns and widgets_seeded ([#1958](https://github.com/Selftend/selftend/issues/1958)) ([#2001](https://github.com/Selftend/selftend/issues/2001)) ([eceef15](https://github.com/Selftend/selftend/commit/eceef15d2132c6937ddf0546df9b241016c01264))
* **onboarding:** the first-run panel carries the routing and mixing guidance ([#2111](https://github.com/Selftend/selftend/issues/2111)) ([#2116](https://github.com/Selftend/selftend/issues/2116)) ([c85cd48](https://github.com/Selftend/selftend/commit/c85cd48a9211888a62aa89bc0f57d0c6a8747d8c))
* **onboarding:** the home tour is retired, and the settings button that re-armed it goes too ([#2109](https://github.com/Selftend/selftend/issues/2109)) ([#2118](https://github.com/Selftend/selftend/issues/2118)) ([8981f1f](https://github.com/Selftend/selftend/commit/8981f1ff43c7b81ed7dee3cadf35161333494fcf))
* **policies:** /faq becomes its own screen, with four collapsible groups ([#2147](https://github.com/Selftend/selftend/issues/2147)) ([#2160](https://github.com/Selftend/selftend/issues/2160)) ([b5c7f9d](https://github.com/Selftend/selftend/commit/b5c7f9d5c112d37dee51a9b9cb29d5b2eb183134))
* **policies:** FAQ_LAYOUT names every entry's place, guarded by a partition ([#2145](https://github.com/Selftend/selftend/issues/2145)) ([#2152](https://github.com/Selftend/selftend/issues/2152)) ([261a5d3](https://github.com/Selftend/selftend/commit/261a5d3b247af9b4aff6b843dcc68ba5b1ddd56d))
* **policies:** the published text moves to the per-country teen floor ([#1767](https://github.com/Selftend/selftend/issues/1767)) ([#1866](https://github.com/Selftend/selftend/issues/1866)) ([efd7909](https://github.com/Selftend/selftend/commit/efd790921e5b5ee785440809337882f5529e7cb0))
* **positioning:** every in-repo surface carries the "mental health tools" frame, in both locales ([#2009](https://github.com/Selftend/selftend/issues/2009)) ([#2021](https://github.com/Selftend/selftend/issues/2021)) ([68ea0b5](https://github.com/Selftend/selftend/commit/68ea0b581a98292ee6dea88d13e0ce4b350ebb84))
* **progress:** record_days answers which days hold a record ([#1904](https://github.com/Selftend/selftend/issues/1904)) ([#1920](https://github.com/Selftend/selftend/issues/1920)) ([b48d094](https://github.com/Selftend/selftend/commit/b48d0943f1856ce787a2c0848415384534f905a2))
* **progress:** the recovery-plan door on Looking back ([#1905](https://github.com/Selftend/selftend/issues/1905)) ([#1918](https://github.com/Selftend/selftend/issues/1918)) ([eaac937](https://github.com/Selftend/selftend/commit/eaac937805f967b46005d9e313c8270e2beb2aa2))
* **progress:** the screen is Looking back, and the mood trend leaves ([#1903](https://github.com/Selftend/selftend/issues/1903)) ([#1913](https://github.com/Selftend/selftend/issues/1913)) ([3416006](https://github.com/Selftend/selftend/commit/3416006b627b6dfc73d836d3a9393029e9dca650))
* **progress:** Your days, one mark per day with a record ([#1906](https://github.com/Selftend/selftend/issues/1906)) ([#1924](https://github.com/Selftend/selftend/issues/1924)) ([3b92f62](https://github.com/Selftend/selftend/commit/3b92f62e19ff4fc6b5f2aeade894e1079eb2dc05))
* **release:** the release-thread cleaner makes every picked line postable as pasted ([#1949](https://github.com/Selftend/selftend/issues/1949)) ([#1964](https://github.com/Selftend/selftend/issues/1964)) ([c43a007](https://github.com/Selftend/selftend/commit/c43a007dcb19f24002933035397b87f703bc05de))
* **release:** the release-thread drafter files one reddit-draft issue per published release ([#1951](https://github.com/Selftend/selftend/issues/1951)) ([#1976](https://github.com/Selftend/selftend/issues/1976)) ([3736edd](https://github.com/Selftend/selftend/commit/3736eddc33d36d3d20c12c066c1669f993d2c80b))
* **release:** the release-thread picker turns a changelog into picks and spares ([#1948](https://github.com/Selftend/selftend/issues/1948)) ([#1961](https://github.com/Selftend/selftend/issues/1961)) ([4ea2d52](https://github.com/Selftend/selftend/commit/4ea2d5228d316ce2ba2e5963c66b1f5820a7f1d8))
* **release:** the release-thread renderer lays out the thread, the submit link and the drafter issue ([#1950](https://github.com/Selftend/selftend/issues/1950)) ([#1967](https://github.com/Selftend/selftend/issues/1967)) ([2af1509](https://github.com/Selftend/selftend/commit/2af1509eda04360529bdaa42afb52b6c5932a171))
* **routines:** the starter routine composes from records, not from widget_preferences ([#1954](https://github.com/Selftend/selftend/issues/1954)) ([#1972](https://github.com/Selftend/selftend/issues/1972)) ([45a002f](https://github.com/Selftend/selftend/commit/45a002f83356c1de9c123694536ac491df736bd9))
* **routines:** the starter-routine offer fires at the second action ([#1677](https://github.com/Selftend/selftend/issues/1677)) ([#1685](https://github.com/Selftend/selftend/issues/1685)) ([979d295](https://github.com/Selftend/selftend/commit/979d295a82333f4aadb02a9eaa4407b85b3dcead))
* **seed:** give demo and bob their decided Home widget layouts ([#1561](https://github.com/Selftend/selftend/issues/1561)) ([2e86a7b](https://github.com/Selftend/selftend/commit/2e86a7bdacc13607dd3390e84a0f8c707969a68d))
* **seed:** seed demo's routines surface — cadences, one reminder, consent ([#1562](https://github.com/Selftend/selftend/issues/1562)) ([b070793](https://github.com/Selftend/selftend/commit/b0707930f4a9971a495494aa71e219e1a3f76c89))
* **settings:** 14a's type scale, column rhythm and phone step-down ([#1830](https://github.com/Selftend/selftend/issues/1830)) ([#1897](https://github.com/Selftend/selftend/issues/1897)) ([bce3f13](https://github.com/Selftend/selftend/commit/bce3f13c028df895a8b6ef91def44a2bddb1ec36))
* **settings:** a row that leaves the app, a run with no card, and a chip that is one of a set ([#1725](https://github.com/Selftend/selftend/issues/1725)) ([#1729](https://github.com/Selftend/selftend/issues/1729)) ([6848c8c](https://github.com/Selftend/selftend/commit/6848c8cbc1c6a4da4c7901af9a3295551abf9e83))
* **settings:** the Appearance group gets an eyebrow, through a shared SettingsGroupLabel ([#1828](https://github.com/Selftend/selftend/issues/1828)) ([#1864](https://github.com/Selftend/selftend/issues/1864)) ([f72afe6](https://github.com/Selftend/selftend/commit/f72afe6fdab4ff4ebb927e397f8e7dfdabde38e2))
* **settings:** the guest identity row says something, from the header's shared expressions ([#1829](https://github.com/Selftend/selftend/issues/1829)) ([#1868](https://github.com/Selftend/selftend/issues/1868)) ([76f5fd4](https://github.com/Selftend/selftend/commit/76f5fd4773757b076b0449cb335f66fee4be6c0a))
* **settings:** the Light/Dark/System control, as one segmented component shared with the menu ([#1827](https://github.com/Selftend/selftend/issues/1827)) ([#1843](https://github.com/Selftend/selftend/issues/1843)) ([91dee23](https://github.com/Selftend/selftend/commit/91dee23f372e34e7d764f4e6fbe275a837385664))
* **settings:** the two row descriptions 14a asks for, and the four it does not ([#1831](https://github.com/Selftend/selftend/issues/1831)) ([#1909](https://github.com/Selftend/selftend/issues/1909)) ([696fcb8](https://github.com/Selftend/selftend/commit/696fcb8f95c5820fb254bf62148be3bf562962ff))
* **support:** seven cards become one column - callout, rows, lists, project, policies, delete ([#1726](https://github.com/Selftend/selftend/issues/1726)) ([#1731](https://github.com/Selftend/selftend/issues/1731)) ([07ff8ac](https://github.com/Selftend/selftend/commit/07ff8acb2bdd1d14500f425312a174eb07888e20))
* **support:** the feedback form gets a category for &quot;this helped&quot; ([#1614](https://github.com/Selftend/selftend/issues/1614)) ([#1646](https://github.com/Selftend/selftend/issues/1646)) ([8d2f71e](https://github.com/Selftend/selftend/commit/8d2f71e6a1138c21e9f3e2445e05264dde9ee6a4))
* **support:** the form - radio chips, a counter, a reply-to line, and a Send that returns ([#1727](https://github.com/Selftend/selftend/issues/1727)) ([#1732](https://github.com/Selftend/selftend/issues/1732)) ([b163aae](https://github.com/Selftend/selftend/commit/b163aae66fdc9d0ed40c4010081de22fa67aa0be))
* **support:** the subreddit joins the ways out of the support page ([#2121](https://github.com/Selftend/selftend/issues/2121)) ([11d1c63](https://github.com/Selftend/selftend/commit/11d1c635a4b6df6b24d338d25d67c3e72410717e))
* **support:** the YouTube channel joins the footer, and the project run rather than the inbox ([#2132](https://github.com/Selftend/selftend/issues/2132)) ([91040dc](https://github.com/Selftend/selftend/commit/91040dc40086488b9b1b662ec8d3b944db8367e6))
* **ui:** all seven policy routes take the 672px column ([#2148](https://github.com/Selftend/selftend/issues/2148)) ([#2157](https://github.com/Selftend/selftend/issues/2157)) ([ce5b0c4](https://github.com/Selftend/selftend/commit/ce5b0c40292dccf475f342003da6731a3a136ea5))
* **ui:** Section's eyebrow takes a heading level, defaulting to 3 ([#2142](https://github.com/Selftend/selftend/issues/2142)) ([#2155](https://github.com/Selftend/selftend/issues/2155)) ([42584b2](https://github.com/Selftend/selftend/commit/42584b2ca3ded377a4abbf257944dfcc6cd8448a))
* **user-menu:** the palette collapses to one row and opens as a pane ([#1774](https://github.com/Selftend/selftend/issues/1774)) ([#1792](https://github.com/Selftend/selftend/issues/1792)) ([7b8324f](https://github.com/Selftend/selftend/commit/7b8324f503721d3efd1fd513d2cb6d86aafa7f09))


### Bug Fixes

* **a11y:** /security stops skipping a heading level ([#2133](https://github.com/Selftend/selftend/issues/2133)) ([#2141](https://github.com/Selftend/selftend/issues/2141)) ([f04f292](https://github.com/Selftend/selftend/commit/f04f292bdd7f47361cdab4b1cba33f1c359e620f))
* **a11y:** CBT route-screen links activate on Enter on web - self-care's sleep and gratitude doors, new goal's values link ([#1736](https://github.com/Selftend/selftend/issues/1736)) ([#1740](https://github.com/Selftend/selftend/issues/1740)) ([9706daf](https://github.com/Selftend/selftend/commit/9706dafc553efa5b31d05eb7cdf96d886b7dc3ca))
* **a11y:** shared link components activate on Enter on web - Show all, shared tools, breadcrumb, donate, colophon ([#1734](https://github.com/Selftend/selftend/issues/1734)) ([#1738](https://github.com/Selftend/selftend/issues/1738)) ([96af133](https://github.com/Selftend/selftend/commit/96af133db9797f25c2310edc0c62711c311450ec))
* **a11y:** the guest heading outline is flat, and a guest is warned before typing ([#1801](https://github.com/Selftend/selftend/issues/1801), [#1865](https://github.com/Selftend/selftend/issues/1865)) ([#2037](https://github.com/Selftend/selftend/issues/2037)) ([eda2a91](https://github.com/Selftend/selftend/commit/eda2a9147dcc50bfdb3bfa5b29127544e209476e))
* **a11y:** tool-screen links activate on Enter on web - habits, meditation, journal, mood ([#1735](https://github.com/Selftend/selftend/issues/1735)) ([#1739](https://github.com/Selftend/selftend/issues/1739)) ([272493f](https://github.com/Selftend/selftend/commit/272493fad3199c9b9f91fb2ab1ee9af6b407fab2))
* **act:** the archives page each finished status, say when a later page fails, and paint details from the cache the lists fill ([#2247](https://github.com/Selftend/selftend/issues/2247)) ([23e6111](https://github.com/Selftend/selftend/commit/23e611128e84db35269f090b66a85f5c0b8aa23b))
* **act:** the spec describes the programme that shipped, and the graduation states the record and stops ([#2011](https://github.com/Selftend/selftend/issues/2011), [#2013](https://github.com/Selftend/selftend/issues/2013)) ([#2038](https://github.com/Selftend/selftend/issues/2038)) ([a35ce00](https://github.com/Selftend/selftend/commit/a35ce00ab7b741408e2b29e99f40a6b14781ac29))
* **act:** two ACT list hooks shared one cache entry across limits ([#1540](https://github.com/Selftend/selftend/issues/1540)) ([4caf47d](https://github.com/Selftend/selftend/commit/4caf47dfe154d7543b11dc027c6415d80d24824c))
* **analytics:** the module table reports usage, and never reads enabled_modules ([#1672](https://github.com/Selftend/selftend/issues/1672)) ([#1687](https://github.com/Selftend/selftend/issues/1687)) ([41577a3](https://github.com/Selftend/selftend/commit/41577a3f286ed416ba1dff3ada65eca8186d60c4))
* **audio:** English-only again, and the two voices were transposed ([#1580](https://github.com/Selftend/selftend/issues/1580)) ([#1585](https://github.com/Selftend/selftend/issues/1585)) ([f4335ee](https://github.com/Selftend/selftend/commit/f4335ee4c696cbfe4b4c28c7720959e9f7d66123))
* **audio:** the seam gate measures the master, and its head/tail half becomes a report ([#1571](https://github.com/Selftend/selftend/issues/1571)) ([#1596](https://github.com/Selftend/selftend/issues/1596)) ([5b850e0](https://github.com/Selftend/selftend/commit/5b850e08c66106d1056b596ff478d4ddcbf8faad))
* **audio:** the shipped bytes get a ceiling, and .m4a joins the binary list ([#1607](https://github.com/Selftend/selftend/issues/1607)) ([#1608](https://github.com/Selftend/selftend/issues/1608)) ([#1642](https://github.com/Selftend/selftend/issues/1642)) ([a7dace5](https://github.com/Selftend/selftend/commit/a7dace5ee0f7cb7a883689ca33014d9bf5461c81))
* **audio:** voice-check must ask the Library, not just the account ([#1579](https://github.com/Selftend/selftend/issues/1579)) ([#1583](https://github.com/Selftend/selftend/issues/1583)) ([f1605a5](https://github.com/Selftend/selftend/commit/f1605a5585072939b8c2447a68f6e51a4d9710dd))
* **auth:** a paused preferences read is an unknown verdict, and its timeout is reportable ([#2271](https://github.com/Selftend/selftend/issues/2271)) ([6921256](https://github.com/Selftend/selftend/commit/692125639e53057ce88aed729dd859a620ca254e))
* **auth:** an unknown age verdict fails closed, with a retry ([#2200](https://github.com/Selftend/selftend/issues/2200)) ([#2224](https://github.com/Selftend/selftend/issues/2224)) ([b4e2bf2](https://github.com/Selftend/selftend/commit/b4e2bf2c52d973d35f0abc92f315251af3380f26))
* **auth:** Denmark's floor follows the Danish statute, at 15 ([#1921](https://github.com/Selftend/selftend/issues/1921)) ([#1937](https://github.com/Selftend/selftend/issues/1937)) ([8211d6d](https://github.com/Selftend/selftend/commit/8211d6da5202013752278d88fcdfaa9d4202b3c7))
* **auth:** one predicate decides what a guest is, and three surfaces stop lying in the stale-flag window ([#1896](https://github.com/Selftend/selftend/issues/1896)) ([#2047](https://github.com/Selftend/selftend/issues/2047)) ([d6d661c](https://github.com/Selftend/selftend/commit/d6d661cda57f88419bbc9cb97f85bdb2e1e9c757))
* **auth:** the age gate reaches 0.17.0-first accounts, and never strands crisis ([#2227](https://github.com/Selftend/selftend/issues/2227), [#2229](https://github.com/Selftend/selftend/issues/2229), [#2228](https://github.com/Selftend/selftend/issues/2228)) ([#2235](https://github.com/Selftend/selftend/issues/2235)) ([29cc8c2](https://github.com/Selftend/selftend/commit/29cc8c26f1a31e351a0b45555d5b6b6094560ca8))
* **auth:** the age gate stops trusting a failure count TanStack resets ([#2274](https://github.com/Selftend/selftend/issues/2274)) ([353c817](https://github.com/Selftend/selftend/commit/353c817c2b73a1ef4167a4ddd12ca37354d9c360))
* **auth:** the guest content notice joins the shared predicate, and the flag stops being passable ([#1896](https://github.com/Selftend/selftend/issues/1896)) ([#2049](https://github.com/Selftend/selftend/issues/2049)) ([047d0b6](https://github.com/Selftend/selftend/commit/047d0b67974b39db8d07e6519257d7ddd1d1b69b))
* **auth:** the under-floor block erases only the account it judged, and only on confirmation ([#2195](https://github.com/Selftend/selftend/issues/2195), [#2193](https://github.com/Selftend/selftend/issues/2193)) ([#2223](https://github.com/Selftend/selftend/issues/2223)) ([3363954](https://github.com/Selftend/selftend/commit/3363954cc502e422ad00f876882e0fe01cb09f81))
* **auth:** the under-floor exit stops promising work it no longer does ([#2232](https://github.com/Selftend/selftend/issues/2232)) ([#2234](https://github.com/Selftend/selftend/issues/2234)) ([19f0159](https://github.com/Selftend/selftend/commit/19f0159e9d44bac29c69a9c03edcfd32cd4d8cdb))
* **bughunt:** seven defects in the fixes landed today ([#2272](https://github.com/Selftend/selftend/issues/2272)) ([6ea4e25](https://github.com/Selftend/selftend/commit/6ea4e257d5c1c2fb7877da6db6703986b84437a7))
* **cbt:** completion copy ends done, and the practice boundary is written and guarded ([#1664](https://github.com/Selftend/selftend/issues/1664)) ([#1666](https://github.com/Selftend/selftend/issues/1666)) ([#1667](https://github.com/Selftend/selftend/issues/1667)) ([#1673](https://github.com/Selftend/selftend/issues/1673)) ([15e05c5](https://github.com/Selftend/selftend/commit/15e05c54b46ae8fa950a509550c99b99e7b2d48f))
* **cbt:** the conditions table is softened for a 13+ readership ([#1867](https://github.com/Selftend/selftend/issues/1867)) ([#2042](https://github.com/Selftend/selftend/issues/2042)) ([7299bcd](https://github.com/Selftend/selftend/commit/7299bcdd5ec6e54b295797b2db6cb487ac630e23))
* **cbt:** the recovery-plan hint stops naming the punishment it withholds ([#1342](https://github.com/Selftend/selftend/issues/1342)) ([#1587](https://github.com/Selftend/selftend/issues/1587)) ([2ee7fe0](https://github.com/Selftend/selftend/commit/2ee7fe0206f274953af5c635dc2418ac9c195da7))
* **cbt:** the weekly review's reflection prompt stops rotating by the week-start date ([#1689](https://github.com/Selftend/selftend/issues/1689)) ([#1690](https://github.com/Selftend/selftend/issues/1690)) ([43cb808](https://github.com/Selftend/selftend/commit/43cb80844457415771a67218fddd8251a55ff7a8))
* **consent:** a recorded policy version never moves backwards ([#2217](https://github.com/Selftend/selftend/issues/2217)) ([#2226](https://github.com/Selftend/selftend/issues/2226)) ([f4376b7](https://github.com/Selftend/selftend/commit/f4376b7d8bf95d9a7f0cccba4c705f55be71f1ee))
* **copy:** safety, legal-boundary and policy copy name the current category noun ([#1957](https://github.com/Selftend/selftend/issues/1957), [#1772](https://github.com/Selftend/selftend/issues/1772)) ([#2036](https://github.com/Selftend/selftend/issues/2036)) ([102fdad](https://github.com/Selftend/selftend/commit/102fdadcb3fb7adb824d57ca2e22b6fa882e2950))
* **coverage:** restore the ratchet floor [#2114](https://github.com/Selftend/selftend/issues/2114) lowered on a false rationale ([#2140](https://github.com/Selftend/selftend/issues/2140)) ([04d2501](https://github.com/Selftend/selftend/commit/04d25017715e1e16208da7234c2dd75930765ab8))
* **dbt:** the coping plan refuses an empty list before the database does, names every candidate chip, and keeps a draft through a failed or paused refetch ([#2245](https://github.com/Selftend/selftend/issues/2245)) ([badad75](https://github.com/Selftend/selftend/commit/badad7513832e61ead41be403c29fe065a6953b3))
* **dbt:** the coping-plan builder waits for the stored plan before it seeds ([#2204](https://github.com/Selftend/selftend/issues/2204)) ([#2222](https://github.com/Selftend/selftend/issues/2222)) ([4d0a9a7](https://github.com/Selftend/selftend/commit/4d0a9a7daeeb2279553ec9fb9df9a25d3a25faaf))
* **dbt:** the coping-plan editor says so when there is no network to read over ([#2231](https://github.com/Selftend/selftend/issues/2231)) ([#2233](https://github.com/Selftend/selftend/issues/2233)) ([23f8763](https://github.com/Selftend/selftend/commit/23f8763c95923cc8a8d8666b01c50f4d33b4a504))
* **dbt:** the record screens save what they show, skip what they say they skip, and climb the whole ladder ([#2248](https://github.com/Selftend/selftend/issues/2248)) ([41ffc43](https://github.com/Selftend/selftend/commit/41ffc43485c09b33ffe3e2cde008cfc3c0d62bd4))
* **docs:** the banned compound leaves contributor prose, and the guard follows it there ([#1644](https://github.com/Selftend/selftend/issues/1644)) ([#1653](https://github.com/Selftend/selftend/issues/1653)) ([b5bcbc3](https://github.com/Selftend/selftend/commit/b5bcbc304fcaf38115519225572d40ce30cd06b0))
* **doors:** a hand-off never overwrites an open draft, and never becomes one ([#2269](https://github.com/Selftend/selftend/issues/2269)) ([fbaa358](https://github.com/Selftend/selftend/commit/fbaa358245dfe5d147283d903e20a799b205f74c))
* **errors:** a paused read is neither an empty history nor an offline one ([#2276](https://github.com/Selftend/selftend/issues/2276)) ([1a59261](https://github.com/Selftend/selftend/commit/1a59261289cdfe487f92968056322e31b8ed01ab))
* **errors:** an online focus-pause keeps its Retry, and the invariant says so ([#2277](https://github.com/Selftend/selftend/issues/2277)) ([4b3cfdc](https://github.com/Selftend/selftend/commit/4b3cfdcbee13c73ec184f257fc437a50aafb67b0))
* **handoff:** a cross-module hand-off lives for one navigation, and four surfaces stop blanking held rows ([#2275](https://github.com/Selftend/selftend/issues/2275)) ([08ae13c](https://github.com/Selftend/selftend/commit/08ae13cff5f11609a90e10330839869cd2c6a0ea))
* **header:** the account actions move above the preference sections ([#1862](https://github.com/Selftend/selftend/issues/1862)) ([#2035](https://github.com/Selftend/selftend/issues/2035)) ([7528fa9](https://github.com/Selftend/selftend/commit/7528fa9f89db37468ea4dfabcb57bae99ab81be5))
* **home:** the arrange row's longest Bulgarian name gets a second line ([#1592](https://github.com/Selftend/selftend/issues/1592)) ([#1593](https://github.com/Selftend/selftend/issues/1593)) ([cf758cc](https://github.com/Selftend/selftend/commit/cf758cc2f9f48e47adfaad693e13355d908b04c5))
* **home:** the longest Bulgarian tool name gets a second line ([#1590](https://github.com/Selftend/selftend/issues/1590)) ([#1591](https://github.com/Selftend/selftend/issues/1591)) ([811ca4e](https://github.com/Selftend/selftend/commit/811ca4ebf671fbd23ee2675c252802278b029853))
* **home:** the module mark gets a column wide enough for it, and the wrap gets a test that can see it ([#2059](https://github.com/Selftend/selftend/issues/2059)) ([#2069](https://github.com/Selftend/selftend/issues/2069)) ([5681d72](https://github.com/Selftend/selftend/commit/5681d72531a6c5666e29011ef781910fc2a323d9))
* **i18n:** bg addressed the reader formally in eight strings ([#2163](https://github.com/Selftend/selftend/issues/2163)) ([#2166](https://github.com/Selftend/selftend/issues/2166)) ([6dca608](https://github.com/Selftend/selftend/commit/6dca608ffc4139fd6a48c9897c52397b2cec3257))
* **i18n:** the house style stops being about one word ([#1639](https://github.com/Selftend/selftend/issues/1639)) ([#1652](https://github.com/Selftend/selftend/issues/1652)) ([29a8ba9](https://github.com/Selftend/selftend/commit/29a8ba95018fe57981ff2c97131876aa074910b3))
* **i18n:** the market category word stops being spelled two ways ([#1651](https://github.com/Selftend/selftend/issues/1651)) ([#1654](https://github.com/Selftend/selftend/issues/1654)) ([d3d91c6](https://github.com/Selftend/selftend/commit/d3d91c605630cb1317b0623252bb8a26c275caf4))
* **meditation:** stage-1 mastery describes the default, not the perfection ([#1670](https://github.com/Selftend/selftend/issues/1670)) ([#1681](https://github.com/Selftend/selftend/issues/1681)) ([f2dccb6](https://github.com/Selftend/selftend/commit/f2dccb632442a8abe87b042afe6beb5f42affa3b))
* **meditation:** the Reflect card stops advertising that it does not grade you ([#1588](https://github.com/Selftend/selftend/issues/1588)) ([#1595](https://github.com/Selftend/selftend/issues/1595)) ([988fbdc](https://github.com/Selftend/selftend/commit/988fbdcdec5f6008a772267262f089de7692ac7c))
* **notifications:** the longest Bulgarian reminder name gets a second line ([#1248](https://github.com/Selftend/selftend/issues/1248)) ([#1589](https://github.com/Selftend/selftend/issues/1589)) ([1d76301](https://github.com/Selftend/selftend/commit/1d7630161dcd82c0d9cf5805a5005adc115f8450))
* **onboarding:** panel 3 calls the tools what panel 1 just called them ([#1775](https://github.com/Selftend/selftend/issues/1775)) ([#1796](https://github.com/Selftend/selftend/issues/1796)) ([f2ecfa0](https://github.com/Selftend/selftend/commit/f2ecfa019f328fd2631c19c56019abf887290129))
* **onboarding:** the concern-at-intake guard stops missing grandfathered accounts ([#1648](https://github.com/Selftend/selftend/issues/1648)) ([#1650](https://github.com/Selftend/selftend/issues/1650)) ([7c9d66b](https://github.com/Selftend/selftend/commit/7c9d66bfba69ace5365300a2248fa4ff36f30608))
* **onboarding:** the copy stops describing things that do not happen ([#1632](https://github.com/Selftend/selftend/issues/1632)) ([#1633](https://github.com/Selftend/selftend/issues/1633)) ([#1634](https://github.com/Selftend/selftend/issues/1634)) ([#1643](https://github.com/Selftend/selftend/issues/1643)) ([358577a](https://github.com/Selftend/selftend/commit/358577aacd378d3c9e9b320d0bf247bb8ac79dd9))
* **paging:** a failed page says so once, and a painted detail stays painted ([#2265](https://github.com/Selftend/selftend/issues/2265)) ([5befa52](https://github.com/Selftend/selftend/commit/5befa520cc933c8d84e7bf5cdcb1e15f14b517d6)), closes [#2253](https://github.com/Selftend/selftend/issues/2253) [#2255](https://github.com/Selftend/selftend/issues/2255) [#2256](https://github.com/Selftend/selftend/issues/2256) [#2257](https://github.com/Selftend/selftend/issues/2257)
* **paging:** the thirteen paged screens that latch a failed page get a Retry ([#2270](https://github.com/Selftend/selftend/issues/2270)) ([8da33f4](https://github.com/Selftend/selftend/commit/8da33f47969c78942407a0ff7351ab0340977126))
* **policies:** the FAQ's contact addresses come from env, not from the copy ([#2150](https://github.com/Selftend/selftend/issues/2150)) ([aeab011](https://github.com/Selftend/selftend/commit/aeab011fbaba5a29831171c8285557d0a2435904))
* **policies:** the last 15 contact addresses leave the consent-bearing copy ([#2131](https://github.com/Selftend/selftend/issues/2131)) ([#2165](https://github.com/Selftend/selftend/issues/2165)) ([2d4056a](https://github.com/Selftend/selftend/commit/2d4056ac5e27d638ee8fcdb94188b5e59a737c6e))
* **positioning:** the frame word is spelled one way, and the invariant joins the gate ([#1627](https://github.com/Selftend/selftend/issues/1627)) ([#1637](https://github.com/Selftend/selftend/issues/1637)) ([7993ea2](https://github.com/Selftend/selftend/commit/7993ea2945c85fc8a3dc4570ce84d83fc3572306))
* **positioning:** the hero stops listing the product flat, and the tools become an on-ramp ([#1628](https://github.com/Selftend/selftend/issues/1628)) ([#1636](https://github.com/Selftend/selftend/issues/1636)) ([0dba8cf](https://github.com/Selftend/selftend/commit/0dba8cf3183ee59a617e385a3d7469b0677da521))
* **positioning:** the plain noun follows the adjective, and the guard grows a third ring ([#1638](https://github.com/Selftend/selftend/issues/1638)) ([#1640](https://github.com/Selftend/selftend/issues/1640)) ([462dfe6](https://github.com/Selftend/selftend/commit/462dfe67cee6338d9e263b122dd4bfa7d1a19165))
* **positioning:** the practitioner claim leaves the copy, and the guard grows a rule ([#1616](https://github.com/Selftend/selftend/issues/1616)) ([#1635](https://github.com/Selftend/selftend/issues/1635)) ([3210cbf](https://github.com/Selftend/selftend/commit/3210cbfe0a26a627156322764a223828851fe581))
* **positioning:** three surfaces state the frame, and one stops arguing against itself ([#1617](https://github.com/Selftend/selftend/issues/1617)) ([#1623](https://github.com/Selftend/selftend/issues/1623)) ([#1629](https://github.com/Selftend/selftend/issues/1629)) ([#1645](https://github.com/Selftend/selftend/issues/1645)) ([3046bf8](https://github.com/Selftend/selftend/commit/3046bf8a017e995f1caedb97850d6d40428cf8b6))
* **progress:** the reflection prompt stops rotating by the weekday ([#1665](https://github.com/Selftend/selftend/issues/1665)) ([#1682](https://github.com/Selftend/selftend/issues/1682)) ([e184952](https://github.com/Selftend/selftend/commit/e184952ec4b434dad43e7647b8771a10eaee04df))
* **reminders:** breathing and ACT reminders vanish once the practice happened today ([#1668](https://github.com/Selftend/selftend/issues/1668)) ([#1683](https://github.com/Selftend/selftend/issues/1683)) ([d9f279f](https://github.com/Selftend/selftend/commit/d9f279f1afa587a4239e7ea9ba60c61c80dd39dd))
* **reminders:** stop offering a reminder the cron holds out, and forward the key the web build never had ([#2267](https://github.com/Selftend/selftend/issues/2267)) ([5c72eab](https://github.com/Selftend/selftend/commit/5c72eabbdd89f1cf24693456e820a056aa96ddec)), closes [#2260](https://github.com/Selftend/selftend/issues/2260) [#2263](https://github.com/Selftend/selftend/issues/2263) [#2221](https://github.com/Selftend/selftend/issues/2221)
* **routines:** the starter offer's second action counts every prompting tool ([#1677](https://github.com/Selftend/selftend/issues/1677)) ([#1691](https://github.com/Selftend/selftend/issues/1691)) ([ce46ded](https://github.com/Selftend/selftend/commit/ce46dedfd57027dd7701672c5d1b6921cea4975b))
* **routines:** the strip note states the record, and restraint-copy guards negated undoing ([#1669](https://github.com/Selftend/selftend/issues/1669)) ([#1686](https://github.com/Selftend/selftend/issues/1686)) ([31b9a90](https://github.com/Selftend/selftend/commit/31b9a90211d50e12e96f950ffdf4231c44eb4560))
* **routines:** withhold DBT step ids from writing until the native rollout lands ([#2203](https://github.com/Selftend/selftend/issues/2203)) ([#2225](https://github.com/Selftend/selftend/issues/2225)) ([7c722f7](https://github.com/Selftend/selftend/commit/7c722f7830d1d2837f64a52be7390b3f8158a445))
* **scripts,docs:** the spelling tripwire catches `defense`, and the age gate gets its evidence figure ([#1970](https://github.com/Selftend/selftend/issues/1970), [#1978](https://github.com/Selftend/selftend/issues/1978), [#1979](https://github.com/Selftend/selftend/issues/1979)) ([#2039](https://github.com/Selftend/selftend/issues/2039)) ([b1e82c9](https://github.com/Selftend/selftend/commit/b1e82c91b241baf9e81139b9bba6c868cb0cbacd))
* **seed:** the ACT band guard survives a run at the UTC day boundary ([#1971](https://github.com/Selftend/selftend/issues/1971)) ([#2016](https://github.com/Selftend/selftend/issues/2016)) ([8321d3e](https://github.com/Selftend/selftend/commit/8321d3eb022000686f79cc8810dd1b34aecbff5a))
* **sentry:** normalise thrown non-Errors before reporting them ([#1553](https://github.com/Selftend/selftend/issues/1553)) ([56caf2a](https://github.com/Selftend/selftend/commit/56caf2a2949ba435360afb1584fa80e80db89ac1))
* **settings:** the four runs and the identity row lose their cards ([#1804](https://github.com/Selftend/selftend/issues/1804)) ([1e52781](https://github.com/Selftend/selftend/commit/1e5278179d3b8fdd50c4c22114832afb5ca24afa))
* **shell:** a second Retry really restarts the read, and the exit copy stops crediting the device ([#2266](https://github.com/Selftend/selftend/issues/2266)) ([909301a](https://github.com/Selftend/selftend/commit/909301ad49285dbe3410e6e1d4ba22752ee5c660)), closes [#2251](https://github.com/Selftend/selftend/issues/2251) [#2252](https://github.com/Selftend/selftend/issues/2252) [#2262](https://github.com/Selftend/selftend/issues/2262)
* **shell:** the block screen keeps its Retry, the under-floor copy stops calling the account empty, and the profile panel loses its card ([#2244](https://github.com/Selftend/selftend/issues/2244)) ([786c9ce](https://github.com/Selftend/selftend/commit/786c9cecf3bd11cf9d1f610ba68ec162da15c231))
* **store:** the age-rating info URL was never in App Store Connect, and the key is gone ([#1803](https://github.com/Selftend/selftend/issues/1803)) ([#2072](https://github.com/Selftend/selftend/issues/2072)) ([a854452](https://github.com/Selftend/selftend/commit/a85445257b7f06f83b7dc5ed235e3470a164dd68))
* **store:** the feature graphic's phone mockups come from a current build ([#2041](https://github.com/Selftend/selftend/issues/2041)) ([#2060](https://github.com/Selftend/selftend/issues/2060)) ([c87f061](https://github.com/Selftend/selftend/commit/c87f06110bf89386ea9875f10996a7fcea98c51f))
* **store:** the live Play description spells catastrophising, and the mirror follows ([#2061](https://github.com/Selftend/selftend/issues/2061)) ([#2066](https://github.com/Selftend/selftend/issues/2066)) ([f66c963](https://github.com/Selftend/selftend/commit/f66c963d504b6fa05ba3674a1eb9de064addc936))
* **store:** the Play feature graphic takes the short form, and its source joins the copy gate ([#2022](https://github.com/Selftend/selftend/issues/2022)) ([#2043](https://github.com/Selftend/selftend/issues/2043)) ([83a6465](https://github.com/Selftend/selftend/commit/83a646525c88d9c1ad2f9d0cd0abf82d96274ddb))
* **support:** the message form is a ruled band, not the column's last card ([#1780](https://github.com/Selftend/selftend/issues/1780)) ([91e9b18](https://github.com/Selftend/selftend/commit/91e9b18b28fd15483c9825a280b343db8a0c3c3c))
* **test:** the positioning corpus follows the index, and the governing doc gets a facts guard ([#1908](https://github.com/Selftend/selftend/issues/1908), [#1944](https://github.com/Selftend/selftend/issues/1944)) ([#2034](https://github.com/Selftend/selftend/issues/2034)) ([94d4746](https://github.com/Selftend/selftend/commit/94d4746dac0a9314e527870e5559abc7075a249e))
* **web:** /legal and /progress take the 672px content column of Settings ([#1721](https://github.com/Selftend/selftend/issues/1721)) ([#1746](https://github.com/Selftend/selftend/issues/1746)) ([b58ed9a](https://github.com/Selftend/selftend/commit/b58ed9a87bbb27bafa4b80d213b7c9047808c08b))


### Performance Improvements

* **audio:** the sit's bells and the guided intro load ahead of their moments ([#1744](https://github.com/Selftend/selftend/issues/1744)) ([#1753](https://github.com/Selftend/selftend/issues/1753)) ([e9a1561](https://github.com/Selftend/selftend/commit/e9a15615137552cb1a2144b861561594add89add))
* **home:** one server aggregate behind the eight tool cards ([#2268](https://github.com/Selftend/selftend/issues/2268)) ([88cea43](https://github.com/Selftend/selftend/commit/88cea438b41aed18f4be16bf808782ac6ea2adbf)), closes [#2212](https://github.com/Selftend/selftend/issues/2212)

## [0.17.0](https://github.com/Selftend/selftend/compare/v0.16.0...v0.17.0) (2026-08-28)


### Features

* **i18n:** screen the Weblate component pass against main before it creates anything ([#1105](https://github.com/Selftend/selftend/issues/1105)) ([#1503](https://github.com/Selftend/selftend/issues/1503)) ([be2cc78](https://github.com/Selftend/selftend/commit/be2cc78152e0e83ca06effaa61a03e47ff3f9805))
* **meditation:** mindful walking and eating return to the practices reference ([#1530](https://github.com/Selftend/selftend/issues/1530)) ([#1534](https://github.com/Selftend/selftend/issues/1534)) ([1fac11c](https://github.com/Selftend/selftend/commit/1fac11c741fda453b14f0bf77f21fb76ec011ca5))
* **meditation:** TMI's half-time check-in bell ([#1189](https://github.com/Selftend/selftend/issues/1189)) ([#1276](https://github.com/Selftend/selftend/issues/1276)) ([d2a9e18](https://github.com/Selftend/selftend/commit/d2a9e182449b2466de13b2d2ae6f069f8503432f))


### Bug Fixes

* **i18n:** call the recovery mindfulness strategy a calming practice ([#1507](https://github.com/Selftend/selftend/issues/1507)) ([#1508](https://github.com/Selftend/selftend/issues/1508)) ([180500e](https://github.com/Selftend/selftend/commit/180500ef8a76a8c6cefdd0ca480dd6d7dc56e9b6))
* **i18n:** tell a missing alerts endpoint apart from an unreadable one ([#1105](https://github.com/Selftend/selftend/issues/1105)) ([#1506](https://github.com/Selftend/selftend/issues/1506)) ([5bada16](https://github.com/Selftend/selftend/commit/5bada169e96b826c07f4c11a26e65a3b2f17cfc4))
* **i18n:** title-case the calming practice strategy label ([#1507](https://github.com/Selftend/selftend/issues/1507)) ([#1509](https://github.com/Selftend/selftend/issues/1509)) ([4b85652](https://github.com/Selftend/selftend/commit/4b856520b136ca8dbb3aba6c42e68dc553d82e0e))

## [0.16.0](https://github.com/Selftend/selftend/compare/v0.15.0...v0.16.0) (2026-08-27)


### Features

* **act:** ACT overview gets real headings and three lifetime stats ([#1378](https://github.com/Selftend/selftend/issues/1378)) ([#1404](https://github.com/Selftend/selftend/issues/1404)) ([b183f35](https://github.com/Selftend/selftend/commit/b183f3542b5396a3318416f224a79e0239b5953c))
* **act:** converge the Also try chips onto SharedToolsRow ([#1216](https://github.com/Selftend/selftend/issues/1216)) ([#1487](https://github.com/Selftend/selftend/issues/1487)) ([6bdb351](https://github.com/Selftend/selftend/commit/6bdb35112153ff4e54d57e6e4718e3a2de7a8c8b))
* **act:** defuse a thought becomes one column with a labelled rail ([#1380](https://github.com/Selftend/selftend/issues/1380)) ([#1412](https://github.com/Selftend/selftend/issues/1412)) ([1630d30](https://github.com/Selftend/selftend/commit/1630d3078d5337e5036de0964646d82496bde069))
* **act:** fold the alignment check-in onto the values screen ([#1379](https://github.com/Selftend/selftend/issues/1379)) ([#1407](https://github.com/Selftend/selftend/issues/1407)) ([f85ef90](https://github.com/Selftend/selftend/commit/f85ef90a1061c96bd74feb512a0ab0819754b6f6))
* **act:** one shared defusion log row for home and the full list ([#1388](https://github.com/Selftend/selftend/issues/1388)) ([#1462](https://github.com/Selftend/selftend/issues/1462)) ([ae53575](https://github.com/Selftend/selftend/commit/ae53575ef0074e3662619673482eafef800bb137))
* **act:** the committed action's target date is picked, not typed ([#1303](https://github.com/Selftend/selftend/issues/1303)) ([#1410](https://github.com/Selftend/selftend/issues/1410)) ([5faea2f](https://github.com/Selftend/selftend/commit/5faea2fddfb1026e83a83fb98ca4a8671a2bb628))
* **app:** every visible modal reports into one overlay-count registry ([#1473](https://github.com/Selftend/selftend/issues/1473)) ([#1477](https://github.com/Selftend/selftend/issues/1477)) ([2ae87b2](https://github.com/Selftend/selftend/commit/2ae87b28c909ae67d635ad313a42bb083c5e80b7))
* **app:** the update popup replaces the banner ([#1475](https://github.com/Selftend/selftend/issues/1475)) ([#1479](https://github.com/Selftend/selftend/issues/1479)) ([801eadc](https://github.com/Selftend/selftend/commit/801eadcee40fe64ca8a127429a68c9123ed6536e))
* **app:** the update trigger hoists to the shell, with per-platform timing and suppression ([#1474](https://github.com/Selftend/selftend/issues/1474)) ([#1478](https://github.com/Selftend/selftend/issues/1478)) ([c5ef519](https://github.com/Selftend/selftend/commit/c5ef5197e8723e8e49a708a21631dbd880c2c1b5))
* **audio:** Round B gets an audition, a zero-lead gate, and a record in the repo ([#1210](https://github.com/Selftend/selftend/issues/1210)) ([#1393](https://github.com/Selftend/selftend/issues/1393)) ([d409774](https://github.com/Selftend/selftend/commit/d40977441238d37540c5b1186e5def04db5019dc))
* **audio:** the size budget gets an instrument, and each voice its own file ([#1210](https://github.com/Selftend/selftend/issues/1210)) ([#1405](https://github.com/Selftend/selftend/issues/1405)) ([522c63b](https://github.com/Selftend/selftend/commit/522c63b63fe41a129318235b0da40e0deaa30a13))
* **auth:** a guest signing in over data gets one calm warning ([#1444](https://github.com/Selftend/selftend/issues/1444)) ([#1469](https://github.com/Selftend/selftend/issues/1469)) ([2f99159](https://github.com/Selftend/selftend/commit/2f99159cff1fd27a72ff8685b705524b639194a1))
* **auth:** a native cold start with no session becomes a guest ([#1440](https://github.com/Selftend/selftend/issues/1440)) ([#1454](https://github.com/Selftend/selftend/issues/1454)) ([168e63d](https://github.com/Selftend/selftend/commit/168e63df4da4153ec33348d8756ce6bd09c3c4ab))
* **auth:** a returning cleaned-up device gets one calm fresh-start notice ([#1450](https://github.com/Selftend/selftend/issues/1450)) ([#1468](https://github.com/Selftend/selftend/issues/1468)) ([708a7e8](https://github.com/Selftend/selftend/commit/708a7e87dc1a7382c88e325ebbc18913d3399c46))
* **auth:** email and password convert the guest in place ([#1443](https://github.com/Selftend/selftend/issues/1443)) ([#1463](https://github.com/Selftend/selftend/issues/1463)) ([307a439](https://github.com/Selftend/selftend/commit/307a4391fb5949ad2ab34ba7f84742ab36dee343))
* **auth:** Google and Apple convert the guest by linking, never by sign-in ([#1445](https://github.com/Selftend/selftend/issues/1445)) ([#1471](https://github.com/Selftend/selftend/issues/1471)) ([bdb6a54](https://github.com/Selftend/selftend/commit/bdb6a54cf3b77a668ab48a23645c6c44418d9d81))
* **auth:** quiet settings card and wizard line invite the guest to register ([#1446](https://github.com/Selftend/selftend/issues/1446)) ([#1465](https://github.com/Selftend/selftend/issues/1465)) ([eb13707](https://github.com/Selftend/selftend/commit/eb137079c65e9fed9c251ef9935d1d0e1445288f))
* **auth:** sign-out and the verify banner do not exist for a guest ([#1442](https://github.com/Selftend/selftend/issues/1442)) ([#1464](https://github.com/Selftend/selftend/issues/1464)) ([3bea2cb](https://github.com/Selftend/selftend/commit/3bea2cbbc61099985f546097594d6e79cbc06375))
* **auth:** the landing Start-now CTA creates a guest and enters the app ([#1441](https://github.com/Selftend/selftend/issues/1441)) ([#1466](https://github.com/Selftend/selftend/issues/1466)) ([3448eec](https://github.com/Selftend/selftend/commit/3448eec0102508e3eb3da976d3cb133c30627d68))
* **cbt:** a thought record rates the same belief twice ([#1376](https://github.com/Selftend/selftend/issues/1376)) ([#1398](https://github.com/Selftend/selftend/issues/1398)) ([0ce8dbb](https://github.com/Selftend/selftend/commit/0ce8dbb2b8e6e12ae5cae6ea554bfdde93388d08))
* **cbt:** shared-tool chips open the tool, not a guide that closes back ([#1192](https://github.com/Selftend/selftend/issues/1192)) ([36ece46](https://github.com/Selftend/selftend/commit/36ece46dfc6439f355ddbdca674edeff8e6ae1ca))
* **cbt:** speaking to yourself, on the Self-care log ([#1283](https://github.com/Selftend/selftend/issues/1283)) ([#1306](https://github.com/Selftend/selftend/issues/1306)) ([2e0a3a1](https://github.com/Selftend/selftend/commit/2e0a3a191b51dce429207e8dc6406dccdc8df261))
* **cbt:** the overview takes the shared section grammar and one history door ([#1386](https://github.com/Selftend/selftend/issues/1386)) ([#1459](https://github.com/Selftend/selftend/issues/1459)) ([05f58de](https://github.com/Selftend/selftend/commit/05f58de2f417a636d64acf5341578a417dc6aeaa))
* **cbt:** the record detail shows only the rows you filled ([#1384](https://github.com/Selftend/selftend/issues/1384)) ([#1457](https://github.com/Selftend/selftend/issues/1457)) ([0cc9922](https://github.com/Selftend/selftend/commit/0cc9922e3e2b95cac20ab3af23af495f40d2e1c8))
* **cbt:** the thought record becomes one scrolling column ([#1381](https://github.com/Selftend/selftend/issues/1381)) ([#1455](https://github.com/Selftend/selftend/issues/1455)) ([176233b](https://github.com/Selftend/selftend/commit/176233b28749d0e33044fb4fea41b37dfce046d8))
* **cbt:** three header stats and this-month thinking-pattern bars on the overview ([#1387](https://github.com/Selftend/selftend/issues/1387)) ([#1461](https://github.com/Selftend/selftend/issues/1461)) ([86b8032](https://github.com/Selftend/selftend/commit/86b803257cdcecb00981d03c49629cb1bc7d173c))
* **cbt:** widen Be's kicker to Wellbeing and rewrite its description ([#1285](https://github.com/Selftend/selftend/issues/1285)) ([#1322](https://github.com/Selftend/selftend/issues/1322)) ([944dd51](https://github.com/Selftend/selftend/commit/944dd51202da6b3dbd558c775ae20e9b2fe5d813))
* **db:** dormant guests are purged after 12 months of inactivity ([#1449](https://github.com/Selftend/selftend/issues/1449)) ([#1460](https://github.com/Selftend/selftend/issues/1460)) ([a5ba4f9](https://github.com/Selftend/selftend/commit/a5ba4f9a596cb444070e49aa90991c0e309764a2))
* **db:** factor account deletion into a shared purge helper ([#1448](https://github.com/Selftend/selftend/issues/1448)) ([#1456](https://github.com/Selftend/selftend/issues/1456)) ([37ce2c9](https://github.com/Selftend/selftend/commit/37ce2c988933fff82e9d9420453742ceeea23f6d))
* **errors:** errors raised inside a native modal go inline ([#1335](https://github.com/Selftend/selftend/issues/1335)) ([#1365](https://github.com/Selftend/selftend/issues/1365)) ([1e3e735](https://github.com/Selftend/selftend/commit/1e3e73571210134b7af199c20d1698de84623e38))
* **escape:** shared components record where they were reached from ([#1265](https://github.com/Selftend/selftend/issues/1265)) ([#1403](https://github.com/Selftend/selftend/issues/1403)) ([9a7e89e](https://github.com/Selftend/selftend/commit/9a7e89e940cf05edae67fdcc962fc7b82195d2c1))
* **escape:** the first-run gate's Escape wears the word ([#1258](https://github.com/Selftend/selftend/issues/1258)) ([#1418](https://github.com/Selftend/selftend/issues/1418)) ([ce58aa4](https://github.com/Selftend/selftend/commit/ce58aa49b79238566556dfac40b76fd54771d973))
* **escape:** the focus sessions carry an Escape of their own ([#1256](https://github.com/Selftend/selftend/issues/1256)) ([#1422](https://github.com/Selftend/selftend/issues/1422)) ([5c21b50](https://github.com/Selftend/selftend/commit/5c21b5028aa75cea9ec905794884e4ba4b437004))
* **escape:** the six (auth) screens get an Escape ([#1254](https://github.com/Selftend/selftend/issues/1254)) ([#1420](https://github.com/Selftend/selftend/issues/1420)) ([5dd0532](https://github.com/Selftend/selftend/commit/5dd0532ad607d39a8b5a6a9050a6c0cd43a3aaff))
* **escape:** the three chrome-less screens reach chrome ([#1255](https://github.com/Selftend/selftend/issues/1255)) ([#1423](https://github.com/Selftend/selftend/issues/1423)) ([0e8960a](https://github.com/Selftend/selftend/commit/0e8960a62208d3920e44ffe4b1d8077ae9a8d345))
* **escape:** therapy modules navigate through the Origin helper ([#1266](https://github.com/Selftend/selftend/issues/1266)) ([#1406](https://github.com/Selftend/selftend/issues/1406)) ([d94faca](https://github.com/Selftend/selftend/commit/d94faca4ebb95714d6cac8091edc66ffebb09c48))
* **escape:** tools and policy pages navigate through the Origin helper ([#1267](https://github.com/Selftend/selftend/issues/1267)) ([#1424](https://github.com/Selftend/selftend/issues/1424)) ([20b4552](https://github.com/Selftend/selftend/commit/20b4552e1842d4247a320fe4446008caefa62a7c))
* **feedback:** mirror submissions to the private #feedback-inbox Discord channel ([#1489](https://github.com/Selftend/selftend/issues/1489)) ([#1490](https://github.com/Selftend/selftend/issues/1490)) ([0af334f](https://github.com/Selftend/selftend/commit/0af334f8e7d59f6f7bd3f7abcf776156e539460a))
* **goals:** pick a guiding value when setting a goal ([#1289](https://github.com/Selftend/selftend/issues/1289)) ([#1343](https://github.com/Selftend/selftend/issues/1343)) ([a9feba6](https://github.com/Selftend/selftend/commit/a9feba6d6563f9bda58c98311e09a087b9837d5d))
* **goals:** show a goal's value on its detail view and list row ([#1291](https://github.com/Selftend/selftend/issues/1291)) ([#1354](https://github.com/Selftend/selftend/issues/1354)) ([472be22](https://github.com/Selftend/selftend/commit/472be2282ffa14818cf87a3f75ebf4b8ad043340))
* **goals:** store an encrypted value key on a goal ([#1287](https://github.com/Selftend/selftend/issues/1287)) ([#1329](https://github.com/Selftend/selftend/issues/1329)) ([f991ef7](https://github.com/Selftend/selftend/commit/f991ef74f78b764830e3dcf22822c4ff500257fd))
* **home:** arrange chips carry the module they come from ([#1246](https://github.com/Selftend/selftend/issues/1246)) ([#1275](https://github.com/Selftend/selftend/issues/1275)) ([8b85d0a](https://github.com/Selftend/selftend/commit/8b85d0aab5ffc6ef35a6bedc422fe2afe1484d97))
* **i18n:** fold the JSON-indent repair into the Weblate pass ([#1105](https://github.com/Selftend/selftend/issues/1105)) ([#1498](https://github.com/Selftend/selftend/issues/1498)) ([183bed1](https://github.com/Selftend/selftend/commit/183bed1f70369205f1e334af5adcef7fd271bb8c))
* **i18n:** script the Weblate component pass and pin its config ([#1105](https://github.com/Selftend/selftend/issues/1105)) ([#1394](https://github.com/Selftend/selftend/issues/1394)) ([404b194](https://github.com/Selftend/selftend/commit/404b19467ca15fc66d47f14dce737934bd307871))
* **inset:** the layered inset model replaces the flat banner inset ([#1339](https://github.com/Selftend/selftend/issues/1339)) ([#1366](https://github.com/Selftend/selftend/issues/1366)) ([07b1e5e](https://github.com/Selftend/selftend/commit/07b1e5ea62b3cd2160335adc2e711ebb19a82337))
* **lint:** a bare router.push is banned outside the Origin helper ([#1269](https://github.com/Selftend/selftend/issues/1269)) ([#1436](https://github.com/Selftend/selftend/issues/1436)) ([ad3964d](https://github.com/Selftend/selftend/commit/ad3964dfe372482d6fc121be471e8cb90eb952e5))
* **lint:** a raw Modal import is now an error outside the frozen five ([#1260](https://github.com/Selftend/selftend/issues/1260)) ([#1426](https://github.com/Selftend/selftend/issues/1426)) ([237c3b6](https://github.com/Selftend/selftend/commit/237c3b6fa96a9ab22b4469c57670b4702667037b))
* **meditation:** the bells can be turned down, and off ([#1188](https://github.com/Selftend/selftend/issues/1188)) ([#1244](https://github.com/Selftend/selftend/issues/1244)) ([6bce0b0](https://github.com/Selftend/selftend/commit/6bce0b09cf7ee8ef4e797e0d0c4f7383b15eaeb4))
* **nav:** every full-screen modal gets a pinned Escape row ([#1252](https://github.com/Selftend/selftend/issues/1252)) ([#1323](https://github.com/Selftend/selftend/issues/1323)) ([ecaf6cf](https://github.com/Selftend/selftend/commit/ecaf6cfc7ad10abf16beb732c8920ee5a796b54d))
* **nav:** leaving Reminders returns you to CBT ([#1261](https://github.com/Selftend/selftend/issues/1261)) ([#1350](https://github.com/Selftend/selftend/issues/1350)) ([4aa4b94](https://github.com/Selftend/selftend/commit/4aa4b94042798d4c818bcfdcea6ab98f58e7476a))
* **nav:** one shared Show all door, and the strings that baked the arrow in ([#1375](https://github.com/Selftend/selftend/issues/1375)) ([#1402](https://github.com/Selftend/selftend/issues/1402)) ([ddacb3b](https://github.com/Selftend/selftend/commit/ddacb3b77fdb55f6578cf229906c8c69ee8bee0d))
* **nav:** the Escape becomes a slot of its own, present on every screen ([#1250](https://github.com/Selftend/selftend/issues/1250)) ([#1294](https://github.com/Selftend/selftend/issues/1294)) ([9977812](https://github.com/Selftend/selftend/commit/99778129f3bdd1f45179b3af779c6b244690f178))
* **nav:** the Escape says where it goes ([#1253](https://github.com/Selftend/selftend/issues/1253)) ([#1341](https://github.com/Selftend/selftend/issues/1341)) ([bc0a36e](https://github.com/Selftend/selftend/commit/bc0a36e1115a5aaf0c9ff66aa08425fa41a47066))
* **pickers:** a typed HH:MM control replaces the browser time input ([#1299](https://github.com/Selftend/selftend/issues/1299)) ([#1400](https://github.com/Selftend/selftend/issues/1400)) ([f4b302f](https://github.com/Selftend/selftend/commit/f4b302fd5b066fbb1ba3fae1f41e6fe6b918552e))
* **pickers:** check-in picker on the shared sheet, localized, draft-until-Done ([#1298](https://github.com/Selftend/selftend/issues/1298)) ([#1324](https://github.com/Selftend/selftend/issues/1324)) ([cef8ee4](https://github.com/Selftend/selftend/commit/cef8ee406a88a6a6a985680a69b14ed25c368ae9))
* **pickers:** extract a shared PickerSheet and ThemedCalendar ([#1311](https://github.com/Selftend/selftend/issues/1311)) ([6c63428](https://github.com/Selftend/selftend/commit/6c63428fc47d75497344d853cb9671d354faa7dd))
* **pickers:** the calendar grid becomes legible to a screen reader ([#1301](https://github.com/Selftend/selftend/issues/1301)) ([#1408](https://github.com/Selftend/selftend/issues/1408)) ([332fb7d](https://github.com/Selftend/selftend/commit/332fb7ded092e8e018236d68b198eaddab4ba176))
* **pickers:** the calendar grid becomes operable by keyboard ([#1305](https://github.com/Selftend/selftend/issues/1305)) ([#1434](https://github.com/Selftend/selftend/issues/1434)) ([7f320c9](https://github.com/Selftend/selftend/commit/7f320c9931385d5bc8c2f79686383a2a62371b36))
* **pickers:** the web check-in picker shows date and time in one view ([#1302](https://github.com/Selftend/selftend/issues/1302)) ([#1419](https://github.com/Selftend/selftend/issues/1419)) ([67a5dfc](https://github.com/Selftend/selftend/commit/67a5dfc494a4c401a9a69070de3c83a36941bdb9))
* **scripts:** beds render natively looping, and the fold becomes the seam-gate fallback ([#1359](https://github.com/Selftend/selftend/issues/1359)) ([#1361](https://github.com/Selftend/selftend/issues/1361)) ([8b8b0e9](https://github.com/Selftend/selftend/commit/8b8b0e9ecc3b5ed9eb48ad9472b3ee4ea9f4946b))
* **scripts:** probe what `loop: true` actually returns ([#1347](https://github.com/Selftend/selftend/issues/1347)) ([#1357](https://github.com/Selftend/selftend/issues/1357)) ([cdb3e63](https://github.com/Selftend/selftend/commit/cdb3e6356ed59891cbb592fbea7e3956c529d58a))
* **scripts:** render grades every take and re-rolls the silent ones ([#1320](https://github.com/Selftend/selftend/issues/1320)) ([#1331](https://github.com/Selftend/selftend/issues/1331)) ([fbbbd29](https://github.com/Selftend/selftend/commit/fbbbd29ea2f22f66806686746916471900b88077))
* **scripts:** the audio post-processor and a calibrated seam gate ([#1296](https://github.com/Selftend/selftend/issues/1296)) ([#1307](https://github.com/Selftend/selftend/issues/1307)) ([b4d73da](https://github.com/Selftend/selftend/commit/b4d73da3daf6e31afa7d6624511ac82deb610534))
* **scripts:** the audition — hear a candidate before picking it ([#1346](https://github.com/Selftend/selftend/issues/1346)) ([#1349](https://github.com/Selftend/selftend/issues/1349)) ([ac9a5c9](https://github.com/Selftend/selftend/commit/ac9a5c9aa35d2e59e96b9e5a2cc95008c997ff50))
* **scripts:** the ElevenLabs render pass for the audio replacement set ([#1159](https://github.com/Selftend/selftend/issues/1159)) ([#1214](https://github.com/Selftend/selftend/issues/1214)) ([8b3607c](https://github.com/Selftend/selftend/commit/8b3607c01f0cad8b281c2f06db5126b40cff68c5))
* **scripts:** the voice render path, raw-PCM handling, and a pre-flight guard ([#1210](https://github.com/Selftend/selftend/issues/1210), [#1316](https://github.com/Selftend/selftend/issues/1316)) ([#1317](https://github.com/Selftend/selftend/issues/1317)) ([9c31211](https://github.com/Selftend/selftend/commit/9c31211d11356ef003f9dcd5ef55e2317072e32f))
* **seed:** the ACT practice logs on the demo account ([#1284](https://github.com/Selftend/selftend/issues/1284)) ([#1330](https://github.com/Selftend/selftend/issues/1330)) ([a630306](https://github.com/Selftend/selftend/commit/a630306cc3396e0fca39d91bbc567e0d0c9d3e88))
* **seed:** the ACT values, bulls-eye history and committed actions ([#1286](https://github.com/Selftend/selftend/issues/1286)) ([#1345](https://github.com/Selftend/selftend/issues/1345)) ([a70ff09](https://github.com/Selftend/selftend/commit/a70ff0907f3a73279b8579411eef264b228c1efe))
* **seed:** the CBT structured work on the demo account ([#1282](https://github.com/Selftend/selftend/issues/1282)) ([#1325](https://github.com/Selftend/selftend/issues/1325)) ([04ea762](https://github.com/Selftend/selftend/commit/04ea762fdac0058b14263bdb2390069d50f2f32e))
* **seed:** the CBT thinking spine on the demo account ([#1281](https://github.com/Selftend/selftend/issues/1281)) ([#1318](https://github.com/Selftend/selftend/issues/1318)) ([ef9da70](https://github.com/Selftend/selftend/commit/ef9da70fa64d9d0446f6443e0ec9ac50aaba1be6))
* **seed:** two CBT/ACT-backed routines and the seed close-out docs ([#1290](https://github.com/Selftend/selftend/issues/1290)) ([#1356](https://github.com/Selftend/selftend/issues/1356)) ([02036f3](https://github.com/Selftend/selftend/commit/02036f35d9f874c49fa194bda5eb0ef47daf63ff))
* **seed:** UTC day helper, derived offsets, and the CBT/ACT teardown contract ([#1280](https://github.com/Selftend/selftend/issues/1280)) ([#1308](https://github.com/Selftend/selftend/issues/1308)) ([8fea069](https://github.com/Selftend/selftend/commit/8fea069c804eb4d2373909f40f3e247f8f6955c8))
* **support:** a guest can ask for a reply - optional reply-to on feedback ([#1447](https://github.com/Selftend/selftend/issues/1447)) ([#1467](https://github.com/Selftend/selftend/issues/1467)) ([fab3afe](https://github.com/Selftend/selftend/commit/fab3afe0d636afed00c3443249bea123f4003fed))
* **toast:** the store becomes a queue with a per-tone policy ([#1336](https://github.com/Selftend/selftend/issues/1336)) ([#1351](https://github.com/Selftend/selftend/issues/1351)) ([d5c7b11](https://github.com/Selftend/selftend/commit/d5c7b11c5248264a7c0e33bccfef9ee38dcead30))
* **toast:** the toast gets its X, its accent bar and its fade ([#1337](https://github.com/Selftend/selftend/issues/1337)) ([#1358](https://github.com/Selftend/selftend/issues/1358)) ([1c99f15](https://github.com/Selftend/selftend/commit/1c99f15f0754e062ad6dd780802c0649104d0f17))
* **toast:** the toast moves to the bottom and steps over the furniture ([#1340](https://github.com/Selftend/selftend/issues/1340)) ([#1392](https://github.com/Selftend/selftend/issues/1392)) ([ae87a8e](https://github.com/Selftend/selftend/commit/ae87a8e1bfaf93be5fa3763487c84095222e55c3))
* **toast:** the toast rides above iOS modals ([#1338](https://github.com/Selftend/selftend/issues/1338)) ([#1360](https://github.com/Selftend/selftend/issues/1360)) ([8af399d](https://github.com/Selftend/selftend/commit/8af399d5a49b1c751b5ad3ea5b1394a1f4dbdd8c))


### Bug Fixes

* **a11y:** give every loading and not-found branch a way out ([#1328](https://github.com/Selftend/selftend/issues/1328)) ([#1496](https://github.com/Selftend/selftend/issues/1496)) ([03e097d](https://github.com/Selftend/selftend/commit/03e097d195beabbd36015e5ac3043f9baf23c762))
* **a11y:** the popover's web entrance respects reduce motion ([#1326](https://github.com/Selftend/selftend/issues/1326)) ([#1416](https://github.com/Selftend/selftend/issues/1416)) ([a44d17a](https://github.com/Selftend/selftend/commit/a44d17afc2db48bd8fa356f6924d7ef49e721456))
* **act:** the Also try row leaves singularity to the layout ([#1309](https://github.com/Selftend/selftend/issues/1309)) ([1f26bf8](https://github.com/Selftend/selftend/commit/1f26bf809a12a3662d8bdfc2ed7821885c5ad8bc))
* **act:** the before/after pair stops claiming the number "stayed at" ([#1367](https://github.com/Selftend/selftend/issues/1367)) ([#1397](https://github.com/Selftend/selftend/issues/1397)) ([39c546c](https://github.com/Selftend/selftend/commit/39c546c70793782c895a5f69cb6c26a62ee074ae))
* **cbt:** three delete confirmations show their failure inside the dialog ([#1364](https://github.com/Selftend/selftend/issues/1364)) ([#1417](https://github.com/Selftend/selftend/issues/1417)) ([36af62b](https://github.com/Selftend/selftend/commit/36af62b7cbe5066710738f89be700e3ab080bc8b))
* **cbt:** Up from a saved thought record no longer lands on a 404 ([#1315](https://github.com/Selftend/selftend/issues/1315)) ([#1491](https://github.com/Selftend/selftend/issues/1491)) ([bddc50a](https://github.com/Selftend/selftend/commit/bddc50a24855b49b9a4f67adb51a7ae2c8e1425d))
* **ci:** cache keys must hash patches/, or patch-package never runs ([#1411](https://github.com/Selftend/selftend/issues/1411)) ([5559fdd](https://github.com/Selftend/selftend/commit/5559fddf14e0cf79b0110fcca5292dcf17c131fd))
* **ci:** the node_modules cache key must see patches/, or a new patch never applies ([#1409](https://github.com/Selftend/selftend/issues/1409)) ([5bb3076](https://github.com/Selftend/selftend/commit/5bb3076b0301f2df4236b0d0fbff4ecbc6bdc5e4))
* **e2e:** await the toast settling instead of sampling one frame of it ([#1396](https://github.com/Selftend/selftend/issues/1396)) ([#1399](https://github.com/Selftend/selftend/issues/1399)) ([344ec84](https://github.com/Selftend/selftend/commit/344ec84547392efea55442131874011d52e01ee7))
* **escape:** each modal keeps exactly one close affordance ([#1257](https://github.com/Selftend/selftend/issues/1257)) ([#1425](https://github.com/Selftend/selftend/issues/1425)) ([03cc684](https://github.com/Selftend/selftend/commit/03cc68415a1817aff21d68f0a4bb34b50bc1af31))
* **i18n:** Bulgarian ACT kicker goes Latin, and two dead category keys go ([#1208](https://github.com/Selftend/selftend/issues/1208)) ([#1413](https://github.com/Selftend/selftend/issues/1413)) ([a5b9c18](https://github.com/Selftend/selftend/commit/a5b9c18086a533fc3807b1ab32b3a484a0872994))
* **i18n:** crisis-guidance link has one Bulgarian name matching its page title ([#1102](https://github.com/Selftend/selftend/issues/1102)) ([fe84f15](https://github.com/Selftend/selftend/commit/fe84f159463199ea5a520b1b8f78ee112c9c600b))
* **i18n:** five drawn CBT strings move to British spelling, their keys do not ([#1377](https://github.com/Selftend/selftend/issues/1377)) ([#1415](https://github.com/Selftend/selftend/issues/1415)) ([eeee9fd](https://github.com/Selftend/selftend/commit/eeee9fdd6e1f173f65544e491c771c4245b09e4f))
* **i18n:** rename act's four bare-plural keys to canonical _one ([#1101](https://github.com/Selftend/selftend/issues/1101)) ([#1121](https://github.com/Selftend/selftend/issues/1121)) ([c5fe303](https://github.com/Selftend/selftend/commit/c5fe303ddc813171d89f96729e6a6734ec58e568))
* **i18n:** sweep Bulgarian terminology drift onto the [#1096](https://github.com/Selftend/selftend/issues/1096) glossary and conventions ([#1062](https://github.com/Selftend/selftend/issues/1062)) ([#1123](https://github.com/Selftend/selftend/issues/1123)) ([ead85dd](https://github.com/Selftend/selftend/commit/ead85dd37c1c3964db936c066e80d8b9f13805ac))
* **meditation:** the Today card remembers both of its controls ([#1190](https://github.com/Selftend/selftend/issues/1190)) ([#1237](https://github.com/Selftend/selftend/issues/1237)) ([c81567f](https://github.com/Selftend/selftend/commit/c81567f2131254504e96c82022f8b7ccc6f4f711))
* **nav:** every route declares whether it is single-instance ([#1313](https://github.com/Selftend/selftend/issues/1313)) ([efd40b0](https://github.com/Selftend/selftend/commit/efd40b004e06e35d692957cb7e60ef082a34c4a5))
* **nav:** the auth screens stop double-mounting each other ([#1355](https://github.com/Selftend/selftend/issues/1355)) ([6f2e6ae](https://github.com/Selftend/selftend/commit/6f2e6aec7a1b5a4080c90ae902a70aaa892a4f77))
* **nav:** the shared-tool chips stop double-mounting their tools ([#1279](https://github.com/Selftend/selftend/issues/1279)) ([8fd83e9](https://github.com/Selftend/selftend/commit/8fd83e9c10ed369cef9f1686aaff77e5b150a7fb))
* **nav:** the trail names what Up hops to, and stops swallowing segments ([#1251](https://github.com/Selftend/selftend/issues/1251)) ([#1312](https://github.com/Selftend/selftend/issues/1312)) ([507562f](https://github.com/Selftend/selftend/commit/507562f6ea674079e25e7b131d0f87b046394234))
* **scripts:** fit Sound Effects prompts under the 450-character API cap ([#1159](https://github.com/Selftend/selftend/issues/1159)) ([#1241](https://github.com/Selftend/selftend/issues/1241)) ([c7b146d](https://github.com/Selftend/selftend/commit/c7b146d512065716680ff1aa6ac532230ae8d490))
* **scripts:** rewrite the thirteen prompts positively, and re-concept two ([#1316](https://github.com/Selftend/selftend/issues/1316)) ([#1321](https://github.com/Selftend/selftend/issues/1321)) ([bc720a0](https://github.com/Selftend/selftend/commit/bc720a05490a057eb2fdc452338550caf8f7f060))
* **scripts:** the guided voice's spoken intro ([#1264](https://github.com/Selftend/selftend/issues/1264)) ([#1277](https://github.com/Selftend/selftend/issues/1277)) ([780fbdc](https://github.com/Selftend/selftend/commit/780fbdc3d484a25569f58b0c26190b1c3b69759b))
* **scripts:** the ocean bed separates by content, not by distance ([#1262](https://github.com/Selftend/selftend/issues/1262)) ([#1272](https://github.com/Selftend/selftend/issues/1272)) ([5269931](https://github.com/Selftend/selftend/commit/526993198fdb0ee299da8c28dc6f35f039a844dc))
* **ui:** the popover's TW4 classes get their TW3 spelling, and a gate ([#1327](https://github.com/Selftend/selftend/issues/1327)) ([#1414](https://github.com/Selftend/selftend/issues/1414)) ([eed7a53](https://github.com/Selftend/selftend/commit/eed7a532695a08d5a1e14a96bbf2852924c90487))
* **web:** a press during a modal's slide-in hits a shield, never the moving control ([#1108](https://github.com/Selftend/selftend/issues/1108)) ([#1115](https://github.com/Selftend/selftend/issues/1115)) ([ae1ca81](https://github.com/Selftend/selftend/commit/ae1ca81ed9e439ed4c7465e2d35acece910696de))

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
