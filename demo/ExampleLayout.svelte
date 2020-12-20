
<script>
</script>

<section>
	<div class="desc">
		<slot name="description"></slot>
	</div>
	<div class="demo">
		<slot name="demo"></slot>
	</div>
</section>

<style>

	section {
		margin: 40px 0;
		display: flex;
		justify-content: space-between;
	}

	.desc {
		padding: 20px;
		width: 100%;
		max-width: 500px;
	}

	.demo {
		padding: 20px;
		width: 100%;
	}

</style>