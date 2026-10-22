<script lang="ts">
	import Masthead from '#lib/components/landing/Masthead.svelte';
	import Hero from '#lib/components/landing/Hero.svelte';
	import Faq from '#lib/components/landing/Faq.svelte';
	import Footer from '#lib/components/Footer.svelte';
</script>

<svelte:head>
	<title>TRMNT — a Hack Club YSWS</title>
</svelte:head>

<Masthead />
<main>
	<Hero />
	<Faq />
</main>
<Footer />
