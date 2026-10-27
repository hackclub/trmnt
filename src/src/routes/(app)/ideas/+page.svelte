<script lang="ts">
	import { resolve } from '$app/paths';
	import device from '#lib/assets/figma/device-leftface.webp';
	import bmo from '#lib/assets/figma/ideas/bmo.webp';
	import dinosaurPlugin from '#lib/assets/figma/ideas/dinosaur-plugin.webp';
	import diyKitParts from '#lib/assets/figma/ideas/diy-kit-parts.webp';
	import enclosureRender from '#lib/assets/figma/ideas/enclosure-render.webp';
	import flightRadarPlugin from '#lib/assets/figma/ideas/flight-radar-plugin.webp';
	import github from '#lib/assets/figma/ideas/github.webp';
	import gopher from '#lib/assets/figma/ideas/gopher.webp';
	import javascript from '#lib/assets/figma/ideas/javascript.webp';
	import python from '#lib/assets/figma/ideas/python.webp';
	import ruggedCase from '#lib/assets/figma/ideas/rugged-case.webp';
	import wikipediaPlugin from '#lib/assets/figma/ideas/wikipedia-plugin.webp';

	type Line = {
		x1: number;
		y1: number;
		x2: number;
		y2: number;
		weight?: number;
		color?: string;
		/** The end that runs off the page's edge, and carries on into the margins */
		bleed?: 'start' | 'end';
		/** Drawn as a vector path, which Figma strokes down the middle */
		centred?: boolean;
	};

	/** How far a line that runs off the page carries on, enough to cross the widest margins */
	const BLEED = 2000;

	const WHITE = 'white';
	const OFF_WHITE = 'var(--off-white)';
	const SALMON = 'var(--salmon)';
	const ORANGE = 'var(--accent-orange)';

	// Every line on the 1920 × 8647 Figma frame, from start to end as Figma draws it (which side
	// it's stroked on depends on that), in the order Figma stacks them
	const TOP_LINES: Line[] = [
		{ x1: 309, y1: 256, x2: 0, y2: 549, bleed: 'end' },
		{ x1: 309, y1: 346, x2: 0, y2: 639, bleed: 'end' },
		{ x1: 309, y1: 436, x2: 0, y2: 729, bleed: 'end' }
	];

	// The lattice of lines and circles beside the first plugin
	const LATTICE: Line[] = [
		{ x1: 1333, y1: 952, x2: 1089, y2: 1509, color: SALMON },
		{ x1: 1047, y1: 952, x2: 803, y2: 1509, color: SALMON },
		{ x1: 957, y1: 852, x2: 713, y2: 1409, color: OFF_WHITE },
		{ x1: 880, y1: 852, x2: 636, y2: 1409, color: SALMON },
		{ x1: 1175, y1: 952, x2: 931, y2: 1509, color: SALMON },
		{ x1: 1103, y1: 904, x2: 1403, y2: 1328, weight: 3, color: SALMON },
		{ x1: 1003, y1: 904, x2: 1303, y2: 1328, weight: 3, color: SALMON },
		{ x1: 903, y1: 904, x2: 1203, y2: 1328, weight: 3, color: SALMON },
		{ x1: 803, y1: 904, x2: 1103, y2: 1328, weight: 3, color: SALMON },
		{ x1: 736, y1: 887, x2: 736, y2: 1430, color: SALMON },
		{ x1: 1773, y1: 952, x2: 1529, y2: 1509, color: SALMON },
		{ x1: 1487, y1: 952, x2: 1243, y2: 1509, color: SALMON },
		{ x1: 1397, y1: 952, x2: 1153, y2: 1509, color: OFF_WHITE },
		{ x1: 1805, y1: 1084, x2: 1153, y2: 1084, color: OFF_WHITE },
		{ x1: 1270, y1: 952, x2: 1026, y2: 1509, color: SALMON },
		{ x1: 1615, y1: 952, x2: 1371, y2: 1509, color: SALMON },
		{ x1: 1543, y1: 904, x2: 1843, y2: 1328, weight: 3, color: SALMON },
		{ x1: 1443, y1: 904, x2: 1743, y2: 1328, weight: 3, color: SALMON },
		{ x1: 1343, y1: 904, x2: 1643, y2: 1328, weight: 3, color: SALMON },
		{ x1: 1243, y1: 904, x2: 1543, y2: 1328, weight: 3, color: SALMON },
		{ x1: 1176, y1: 887, x2: 1176, y2: 1430, color: SALMON },
		{ x1: 1773, y1: 887, x2: 1773, y2: 1430, color: SALMON },
		{ x1: 1510, y1: 887, x2: 1510, y2: 1430, color: SALMON }
	];
	const LATTICE_CIRCLES = [
		{ x: 614, y: 1130 },
		{ x: 932, y: 1166 },
		{ x: 1054, y: 1130 },
		{ x: 1372, y: 1166 },
		{ x: 1543, y: 887 }
	];

	// Over the first plugin: two corner marks tipped like the caption they frame, then the rule
	// that steps down under the caption above
	const CAPTION_LINES: Line[] = [
		{ x1: 1063.08, y1: 1680.3, x2: 1319.76, y2: 1638.91, weight: 2, color: OFF_WHITE },
		{ x1: 1063.08, y1: 1680.3, x2: 1077.37, y2: 1768.91, weight: 2, color: OFF_WHITE },
		{ x1: 1049, y1: 1670.37, x2: 1305.68, y2: 1628.98, weight: 2, color: OFF_WHITE },
		{ x1: 1049, y1: 1670.37, x2: 1063.29, y2: 1758.98, weight: 2, color: OFF_WHITE },
		{ x1: 1076, y1: 629, x2: 1175, y2: 629, color: OFF_WHITE },
		{ x1: 1198, y1: 679, x2: 1175, y2: 628, color: OFF_WHITE },
		{ x1: 1177, y1: 679, x2: 1154, y2: 628, color: OFF_WHITE },
		{ x1: 1502, y1: 730, x2: 1479, y2: 679, color: OFF_WHITE },
		{ x1: 1474, y1: 730, x2: 1451, y2: 679, color: OFF_WHITE },
		{ x1: 1176, y1: 680, x2: 1479, y2: 680, color: OFF_WHITE },
		{ x1: 1473, y1: 731, x2: 1882, y2: 731, color: OFF_WHITE },
		{ x1: 1678, y1: 706, x2: 1678, y2: 755, color: OFF_WHITE },
		{ x1: 1838, y1: 706, x2: 1838, y2: 755, color: OFF_WHITE }
	];

	// Around the flight radar: some pass behind it, some start where it ends
	const BEHIND_RADAR: Line[] = [
		{ x1: 525.3, y1: 2486.4, x2: -0.5, y2: 2888.71, color: OFF_WHITE, bleed: 'end', centred: true },
		{ x1: 525.3, y1: 2326.4, x2: -0.5, y2: 2728.71, color: OFF_WHITE, bleed: 'end', centred: true },
		{ x1: 525.3, y1: 2406.4, x2: -0.5, y2: 2808.71, color: OFF_WHITE, bleed: 'end', centred: true },
		{ x1: 1919.3, y1: 2216.4, x2: 1393.5, y2: 2618.71, color: OFF_WHITE, bleed: 'start', centred: true },
		{ x1: 1919.3, y1: 2056.4, x2: 1393.5, y2: 2458.71, color: OFF_WHITE, bleed: 'start', centred: true },
		{ x1: 1919.3, y1: 2136.4, x2: 1393.5, y2: 2538.71, color: OFF_WHITE, bleed: 'start', centred: true },
		{ x1: 326, y1: 2231, x2: 0, y2: 2231, color: OFF_WHITE, bleed: 'end' },
		{ x1: 326, y1: 2201.5, x2: 212.5, y2: 2201.5, centred: true }
	];
	const BESIDE_RADAR: Line[] = [
		{ x1: 1919, y1: 2740, x2: 1593, y2: 2740, color: OFF_WHITE, bleed: 'start' },
		{ x1: 1919, y1: 2710, x2: 1593, y2: 2710, color: OFF_WHITE, bleed: 'start' },
		// A peak in the rule above
		{ x1: 212.5, y1: 2201.5, x2: 104, y2: 2147.5, color: OFF_WHITE, centred: true },
		{ x1: 104, y1: 2147.5, x2: 0, y2: 2201.5, color: OFF_WHITE, centred: true }
	];

	/** A thin rule over a thick one between two thin ones, across the page at y */
	function separator(y: number): Line[] {
		return [
			{ x1: 109, y1: y + 30, x2: 1811, y2: y + 30, weight: 2, color: OFF_WHITE },
			{ x1: 109, y1: y + 60, x2: 1811, y2: y + 60, color: OFF_WHITE },
			{ x1: 109, y1: y, x2: 1811, y2: y, color: OFF_WHITE }
		];
	}

	/** Pairs of rules running into a guide button from each side; y is the button's top */
	function guideRules(y: number): Line[] {
		return [
			{ x1: 434, y1: y + 17, x2: 681, y2: y + 17, color: ORANGE },
			{ x1: 476, y1: y + 57, x2: 681, y2: y + 57, color: ORANGE },
			{ x1: 1481, y1: y + 109, x2: 1234, y2: y + 109, color: ORANGE },
			{ x1: 1439, y1: y + 69, x2: 1234, y2: y + 69, color: ORANGE }
		];
	}

	// Under the languages' frameworks, in from each edge
	const FRAMEWORK_LINES: Line[] = [
		{ x1: 0, y1: 4459, x2: 366, y2: 4459, bleed: 'start' },
		{ x1: 0, y1: 4539, x2: 413, y2: 4539, bleed: 'start' },
		{ x1: 0, y1: 4489, x2: 337, y2: 4489, bleed: 'start' },
		{ x1: 0, y1: 4509, x2: 290, y2: 4509, bleed: 'start' },
		{ x1: 1920, y1: 4459, x2: 1660, y2: 4459, bleed: 'start' },
		{ x1: 1920, y1: 4539, x2: 1700, y2: 4539, bleed: 'start' },
		// Mirrored in Figma rather than turned, so it's stroked as if it ran rightwards
		{ x1: 1583, y1: 4489, x2: 1920, y2: 4489, bleed: 'end' },
		{ x1: 1920, y1: 4509, x2: 1740, y2: 4509, bleed: 'start' }
	];

	// Behind the GitHub logo
	const GITHUB_LINES: Line[] = [
		{ x1: 1386, y1: 5376, x2: 1150, y2: 5582 },
		{ x1: 1386, y1: 5436, x2: 1150, y2: 5642 },
		{ x1: 561, y1: 5857, x2: 797, y2: 5651 },
		{ x1: 561, y1: 5797, x2: 797, y2: 5591 },
		{ x1: 1133, y1: 5838, x2: 1495, y2: 5838 },
		{ x1: 1133, y1: 5788, x2: 1495, y2: 5788 },
		{ x1: 558, y1: 5550, x2: 815, y2: 5550 },
		{ x1: 453, y1: 5500, x2: 815, y2: 5500 }
	];

	// Crossing the BYOS docs button, which covers part of them
	const BYOS_LINES: Line[] = [
		{ x1: 634, y1: 6026, x2: 718, y2: 6136, color: SALMON },
		{ x1: 664, y1: 6016, x2: 748, y2: 6126, color: SALMON },
		{ x1: 1189, y1: 6151, x2: 1273, y2: 6261, color: SALMON },
		{ x1: 1219, y1: 6141, x2: 1303, y2: 6251, color: SALMON }
	];

	/** Where a line's box goes. Level and upright ones stay unturned, so they keep to whole pixels. */
	function place({ x1, y1, x2, y2, weight = 1, color = WHITE, bleed, centred }: Line) {
		let length = Math.hypot(x2 - x1, y2 - y1);
		const [cos, sin] = [(x2 - x1) / length, (y2 - y1) / length];
		if (bleed === 'start') [x1, y1] = [x1 - cos * BLEED, y1 - sin * BLEED];
		if (bleed) length += BLEED;
		// How far the stroke reaches to the line's left, looking the way it runs
		const shift = centred ? weight / 2 : weight;
		const line = { x: x1, y: y1 - shift, length, weight, shift, color };

		if (sin === 0 || cos === 0) {
			// The stroke's corners, at either end and on either side
			const ends = [0, length];
			const sides = [shift - weight, shift];
			const xs = ends.flatMap((s) => sides.map((u) => x1 + s * cos + u * sin));
			const ys = ends.flatMap((s) => sides.map((u) => y1 + s * sin - u * cos));
			return { ...line, kind: sin === 0 ? ('across' as const) : ('down' as const), x: Math.min(...xs), y: Math.min(...ys) };
		}
		return { ...line, kind: 'slant' as const, angle: (Math.atan2(sin, cos) * 180) / Math.PI };
	}
</script>

<svelte:head>
	<title>Ideas — TRMNT</title>
</svelte:head>

{#snippet lines(list: Line[])}
	{#each list.map(place) as line, i (i)}
		<span
			class="line {line.kind}"
			style:--x={line.x}
			style:--y={line.y}
			style:--length={line.length}
			style:--weight={line.weight}
			style:--shift={line.shift}
			style:--angle={line.kind === 'slant' ? `${line.angle}deg` : undefined}
			style:background={line.color}
		></span>
	{/each}
{/snippet}

<!-- An off-white panel set into an orange slab, like the shop button on Home -->
{#snippet guide(label: string, href: string, x: number, y: number, external = false)}
	<a
		class="guide"
		{href}
		target={external ? '_blank' : undefined}
		style:--x={x}
		style:--y={y}
	>
		<span>{label}</span>
	</a>
{/snippet}

<main class="ideas">
	<!-- Not in Figma: the design has no way back yet -->
	<a class="home" href={resolve('home')}>← home</a>

	<h1 class="text title" style:--x={447} style:--y={45} style:--w={1026} style:--h={60}>
		there’s tons of cool projects you could make!
	</h1>
	{@render lines(TOP_LINES)}

	<!-- Custom plugins -->
	<h2 class="text heading" style:--x={555} style:--y={193} style:--w={810} style:--h={25}>
		- CUSTOM PLUGINS -
	</h2>
	<p class="text body set" style:--x={29} style:--y={276} style:--w={1850} style:--h={102}>
		{'by writing a custom plugin, you can display any kind of data you want on your awesome e-ink screen!\nbefore you start developing, here are some existing plugins to inspire you, ordered by complexity:'}
	</p>
	<p class="text body set right" style:--x={1000} style:--y={487} style:--w={882} style:--h={204}>
		{'this is a super simple plugin that pulls the image\nof the day from Wikipedia. minimal code, just \none quick API call and some HTML to\n put it up on screen!'}
	</p>
	<p
		class="text body turned"
		style:--x={1080}
		style:--y={1685.48}
		style:--w={744.67}
		style:--h={255}
		style:--angle="-8.84deg"
	>
		here’s an example that’s just a little more advanced, grabbing a little more data. the layout is
		more complex, and the information is organized in a cool and helpful way!
	</p>

	{@render lines(LATTICE)}
	{#each LATTICE_CIRCLES as { x, y }, i (i)}
		<span class="circle" style:--x={x} style:--y={y}></span>
	{/each}
	<img
		class="art turned"
		src={wikipediaPlugin}
		alt="A plugin showing a sea urchin, the day’s pick from Wikipedia"
		style:--x={-195.99}
		style:--y={777.08}
		style:--w={1190.25}
		style:--h={713.26}
		style:--angle="-16.71deg"
	/>
	{@render lines(CAPTION_LINES)}
	<img
		class="art turned"
		src={dinosaurPlugin}
		alt="A plugin showing the dinosaur of the day, a Triceratops, with its classification and a description"
		style:--x={-9.25}
		style:--y={1170.58}
		style:--w={1045.67}
		style:--h={625.3}
		style:--angle="8.17deg"
		style:--radius={22}
	/>

	{@render lines(BEHIND_RADAR)}
	<img
		class="art"
		src={flightRadarPlugin}
		alt="A plugin showing a radar map of the planes flying over Belgium, each labelled with its flight, aircraft and route"
		style:--x={302}
		style:--y={2030}
		style:--w={1291}
		style:--h={774}
		style:--radius={13}
	/>
	{@render lines(BESIDE_RADAR)}
	<p class="text body" style:--x={302} style:--y={2824} style:--w={1291} style:--h={129}>
		this is probably the coolest plugin i’ve seen so far - a live radar map of all the flights within
		range of you!!
	</p>
	<p class="text body" style:--x={204} style:--y={3005} style:--w={1512} style:--h={129}>
		it uses open data from ADS-B, the protocol planes use to broadcast their location openly. the plugin
		grabs this data from airplanes.live, adsb.lol, and adsb.fi, data about airports and routes from
		adsdb and OurAirports, and puts this all on a map provided by OpenStreetMap!
	</p>
	{@render guide('plugin guide', resolve('/(app)/guides/[guide]', { guide: 'plugins' }), 681, 3213)}
	{@render lines(guideRules(3213))}

	<!-- Plugin backends -->
	{@render lines(separator(3400))}
	<h2 class="text heading" style:--x={555} style:--y={3516} style:--w={810} style:--h={25}>
		- PLUGIN BACKENDS -
	</h2>
	<p class="text body" style:--x={35} style:--y={3571} style:--w={1850} style:--h={222}>
		need to grab data from a source that isn’t publicly open, requires authentication, or requires some
		heavier pre-processing? writing your own backend for a TRMNL is as easy as writing any other HTTPS
		server!
	</p>
	<p class="text body" style:--x={35} style:--y={3751} style:--w={1850} style:--h={222}>
		that means you can write your backend in whatever language you’d like, and thus use whatever other
		packages from that language you want! here are some good options for languages for your backend:
	</p>

	<p class="text language" style:--x={446} style:--y={3946} style:--w={71} style:--h={72}>go</p>
	<p class="text language" style:--x={863} style:--y={3946} style:--w={193} style:--h={72}>python</p>
	<p class="text language" style:--x={1300} style:--y={3946} style:--w={274} style:--h={72}>
		javascript
	</p>
	<img class="art" src={python} alt="" style:--x={775} style:--y={4044} style:--w={369} style:--h={369} />
	<img
		class="art"
		src={javascript}
		alt=""
		style:--x={1253}
		style:--y={4044}
		style:--w={369}
		style:--h={369}
		style:--radius={16}
	/>
	<img class="art" src={gopher} alt="" style:--x={297} style:--y={4044} style:--w={369} style:--h={369} />
	<p class="text language" style:--x={366} style:--y={4423} style:--w={231} style:--h={72}>net/http</p>
	<p class="text language" style:--x={811} style:--y={4423} style:--w={297} style:--h={72}>
		http.server
	</p>
	<p class="text language" style:--x={889} style:--y={4483} style:--w={141} style:--h={72}>Flask</p>
	<p class="text language" style:--x={429} style:--y={4488} style:--w={94} style:--h={72}>Gin</p>
	<p class="text language" style:--x={1304} style:--y={4423} style:--w={264} style:--h={72}>
		Bun.serve
	</p>
	<p class="text language" style:--x={1189} style:--y={4488} style:--w={495} style:--h={72}>
		http.CreateServer
	</p>
	{@render lines(FRAMEWORK_LINES)}
	{@render guide('backend guide', resolve('/(app)/guides/[guide]', { guide: 'backends' }), 681, 4623)}
	{@render lines(guideRules(4623))}

	<!-- Custom server -->
	{@render lines(separator(4810))}
	{@render lines(BYOS_LINES)}
	<h2 class="text heading" style:--x={664} style:--y={4900} style:--w={593} style:--h={77}>
		- CUSTOM SERVER -
	</h2>
	<p class="text body" style:--x={35} style:--y={4981} style:--w={1850} style:--h={222}>
		this one’s the real challenge, for those of you who’ve built a good few backends and wanna push
		yourself (or you just don’t wanna pay for a device key to connect to TRMNL’s servers).
	</p>
	<p class="text body" style:--x={35} style:--y={5130} style:--w={1850} style:--h={222}>
		every part of TRMNL’s infrastructure is open-source. that means that you can write your own
		implementation of their architecture in whatever language you’d like, and self-host the entire
		ecosystem!
	</p>
	{@render lines(GITHUB_LINES)}
	<a
		class="art"
		href="https://github.com/usetrmnl/terminus"
		target="_blank"
		style:--x={703}
		style:--y={5376}
		style:--w={543}
		style:--h={543}
	>
		<img src={github} alt="Terminus, TRMNL’s own server, on GitHub" />
	</a>
	{@render guide('TRMNL BYOS docs', 'https://docs.trmnl.com/go/diy/byos', 696, 6072, true)}

	<!-- Custom enclosure -->
	{@render lines(separator(6300))}
	<h2 class="text heading" style:--x={596} style:--y={6420} style:--w={728} style:--h={77}>
		- CUSTOM ENCLOSURE -
	</h2>
	<p class="text body" style:--x={35} style:--y={6471} style:--w={1850} style:--h={222}>
		are you more of a CAD person?
	</p>
	<p class="text body" style:--x={35} style:--y={7395} style:--w={1850} style:--h={108}>
		here are some cool ideas you could design:
	</p>
	<p class="text body" style:--x={35} style:--y={6617} style:--w={1850} style:--h={77}>
		you can get BFTs by designing a custom enclosure for the TRMNL DIY Kit listed in the shop!
	</p>
	<img
		class="art"
		src={enclosureRender}
		alt="An orange enclosure that props a TRMNL’s screen up on a stand"
		style:--x={168}
		style:--y={6768}
		style:--w={810}
		style:--h={593}
	/>
	<img
		class="art"
		src={diyKitParts}
		alt="The parts in the TRMNL DIY Kit: an e-ink panel, a circuit board, a battery and cables"
		style:--x={986}
		style:--y={6844}
		style:--w={838}
		style:--h={408}
	/>

	<p class="text caption" style:--x={12} style:--y={7578} style:--w={677} style:--h={82}>
		an enclosure to make your TRMNL look like BMO from Adventure Time!
	</p>
	<p class="text caption" style:--x={730} style:--y={7528} style:--w={512} style:--h={123}>
		an enclosure to make your TRMNL look like it’s in the jaws of a ferocious monster!
	</p>
	<img class="art" src={bmo} alt="BMO" style:--x={58} style:--y={7677} style:--w={515} style:--h={661} />
	<!-- Drawn here rather than exported, so its shapes stay sharp: the TRMNL shows between the
	     monster's eyes and teeth -->
	<div class="art monster" style:--x={801} style:--y={7696} style:--w={370} style:--h={546}>
		<svg viewBox="0 0 370 546" aria-hidden="true">
			<path
				d="M185 0C284.155 0 365.09 78.0074 369.784 176H370V546H0V176H0.21582C4.90983 78.0074 85.8448 0 185 0Z"
				fill="var(--accent-orange)"
			/>
			{#each [36, 224] as x (x)}
				<g transform="translate({x} 110)">
					<circle cx="54.5" cy="54.5" r="54.5" fill="var(--salmon)" />
					<path
						d="M109 54.5C109 44.8384 106.432 35.3504 101.558 27.0081C96.6842 18.6658 89.6804 11.769 81.264 7.02433C72.8476 2.27967 63.3212 -0.142324 53.6607 0.0064646C44.0002 0.155253 34.5529 2.86948 26.2866 7.87108C18.0204 12.8727 11.2323 19.9819 6.6178 28.4703C2.00332 36.9588 -0.271687 46.5213 0.0258557 56.1784C0.323398 65.8355 3.18279 75.2398 8.3111 83.4281C13.4394 91.6164 20.6523 98.2942 29.2108 102.777L54.5 54.5H109Z"
						fill="var(--off-white)"
					/>
				</g>
			{/each}
		</svg>
		<img class="jaws" src={device} alt="" />
		<svg viewBox="0 0 370 546" aria-hidden="true">
			<path
				transform="translate(27 431)"
				d="M315.221 102.5H0L31.6104 0L63.1104 102.142L94.6104 0L126.11 102.142L157.61 0L189.11 102.142L220.61 0L252.11 102.142L283.61 0L315.221 102.5Z"
				fill="var(--off-white)"
			/>
			<path
				transform="matrix(1 0 0 -1 60 378)"
				d="M252.221 111H0L31.6104 0L63.1104 110.612L94.6104 0L126.11 110.612L157.61 0L189.11 110.612L220.61 0L252.221 111Z"
				fill="var(--off-white)"
			/>
			<circle cx="278.5" cy="164.5" r="36.5" fill="var(--maroon)" />
			<circle cx="90.5" cy="164.5" r="36.5" fill="var(--maroon)" />
		</svg>
	</div>
	<p class="text caption" style:--x={1319} style:--y={7548} style:--w={512} style:--h={82}>
		a rugged waterproof enclosure to make your TRMNL all-weather??
	</p>
	<img
		class="art"
		src={ruggedCase}
		alt="A rugged tan carry case"
		style:--x={1253}
		style:--y={7751}
		style:--w={621}
		style:--h={423}
	/>
	{@render guide('guide and specs', resolve('/(app)/guides/[guide]', { guide: 'enclosures' }), 681, 8338)}
	{@render lines(guideRules(8338))}
</main>

<style>
	.ideas {
		position: relative;
		height: calc(8647 * var(--u));
	}

	.home,
	.text,
	.line,
	.circle,
	.art,
	.guide {
		position: absolute;
		margin: 0;
	}

	.home {
		left: calc(48 * var(--u));
		top: calc(40 * var(--u));
		font: 400 calc(32 * var(--u)) / normal var(--font-sans);
		color: var(--salmon);
		text-decoration: underline;
	}

	/* Figma's text boxes. Their text sits in the middle and spills out evenly when it's bigger,
	   as Figma's does. */
	.text {
		left: calc(var(--x) * var(--u));
		top: calc(var(--y) * var(--u));
		width: calc(var(--w) * var(--u));
		height: calc(var(--h) * var(--u));
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		text-align: center;
		color: var(--off-white);
	}

	.title {
		font: 700 calc(50 * var(--u)) / normal var(--font-sans);
		color: var(--salmon);
		white-space: nowrap;
	}

	.heading {
		font: italic 500 calc(60 * var(--u)) / normal var(--font-serif);
		white-space: nowrap;
	}

	.body {
		font: italic 500 calc(40 * var(--u)) / normal var(--font-serif);
	}

	.caption {
		font: italic 500 calc(32 * var(--u)) / normal var(--font-serif);
	}

	.language {
		font: italic 500 calc(60 * var(--u)) / normal var(--font-sans);
		color: white;
		white-space: nowrap;
	}

	/* Lines broken by hand, spaces and all */
	.set {
		white-space: pre;
	}

	.right {
		align-items: flex-end;
		text-align: right;
	}

	/* Turned about the top-left corner, as Figma turns things */
	.turned {
		transform-origin: 0 0;
		rotate: var(--angle);
	}

	/* Boxes rather than images, so level and upright lines snap to whole screen pixels and none
	   thin out once the page is scaled down */
	.line {
		left: calc(var(--x) * var(--u));
		top: calc(var(--y) * var(--u));
	}

	.across,
	.slant {
		width: calc(var(--length) * var(--u));
		height: max(1px, calc(var(--weight) * var(--u)));
	}

	.down {
		width: max(1px, calc(var(--weight) * var(--u)));
		height: calc(var(--length) * var(--u));
	}

	/* Turned about the line's start */
	.slant {
		transform-origin: 0 calc(var(--shift) * var(--u));
		rotate: var(--angle);
	}

	.circle {
		left: calc(var(--x) * var(--u));
		top: calc(var(--y) * var(--u));
		box-sizing: border-box;
		width: calc(243 * var(--u));
		height: calc(243 * var(--u));
		border: max(1px, calc(1 * var(--u))) solid var(--salmon);
		border-radius: 50%;
	}

	.art {
		left: calc(var(--x) * var(--u));
		top: calc(var(--y) * var(--u));
		width: calc(var(--w) * var(--u));
		height: calc(var(--h) * var(--u));
		border-radius: calc(var(--radius, 0) * var(--u));
		object-fit: cover;
	}

	.art img {
		display: block;
		width: 100%;
		height: 100%;
	}

	.monster svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	/* The TRMNL in the monster's mouth, cut a little short at the bottom */
	.monster .jaws {
		position: absolute;
		left: calc(16 * var(--u));
		top: calc(287 * var(--u));
		width: calc(328 * var(--u));
		height: calc(244 * var(--u));
		object-fit: cover;
		object-position: top;
	}

	.guide {
		left: calc(var(--x) * var(--u));
		top: calc(var(--y) * var(--u));
		width: calc(558 * var(--u));
		height: calc(129 * var(--u));
		background: var(--accent-orange);
	}

	.guide span {
		position: absolute;
		left: calc(21.815 * var(--u));
		top: calc(16.74 * var(--u));
		display: flex;
		align-items: center;
		justify-content: center;
		width: calc(514.37 * var(--u));
		height: calc(95.519 * var(--u));
		background: var(--off-white);
		font: 700 calc(50 * var(--u)) / normal var(--font-sans);
		color: var(--accent-orange);
		white-space: nowrap;
	}
</style>
