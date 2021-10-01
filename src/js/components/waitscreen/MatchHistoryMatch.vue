<template>
    <div class="match">
        <img class="match-avatar" :src="match.players[1].avatar">

        <div class="match-info">
            <div class="round">{{ match.round }}</div>
            <div class="opponent">{{ match.players[1].name }}</div>
        </div>

        <div class="score"
            :class="{
                'green--text': match.winner == 0,
                'red--text': match.winner == 1,
            }"
        >{{ match.score }}</div>
    </div>
</template>

<script>
export default {
    props: [
        "match"
    ]
};
</script>
