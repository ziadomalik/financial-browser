<template>
    <div class="flex flex-col gap-2 items-center w-full">
        <div class="w-1/3 flex flex-col gap-2 m-5">
            <SInput v-model="query" placeholder="Enter your query" />
            <SButton @click="handleClick">Click me</SButton>
            <pre>{{ result }}</pre> 
        </div>
        <!-- <div ref="cardContainer" class="max-w-md flex flex-col gap-2 m-5"></div> -->
        <AdaptiveCard :card="adaptiveCardExample" :closable="true" />
    </div>
</template>

<script setup lang="ts">

const adaptiveCardExample = {
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "type": "AdaptiveCard",
  "version": "1.0",
  "body": [
    {
      "type": "Container",
      "items": [
        {
          "type": "TextBlock",
          "text": "Publish Adaptive Card schema",
          "weight": "bolder",
          "size": "medium"
        },
        {
          "type": "ColumnSet",
          "columns": [
            {
              "type": "Column",
              "width": "auto",
              "items": [
                {
                  "type": "Image",
                  "url": "https://pbs.twimg.com/profile_images/3647943215/d7f12830b3c17a5a9e4afcc370e3a37e_400x400.jpeg",
                  "altText": "Matt Hidinger",
                  "size": "small",
                  "style": "person"
                }
              ]
            },
            {
              "type": "Column",
              "width": "stretch",
              "items": [
                {
                  "type": "TextBlock",
                  "text": "Matt Hidinger",
                  "weight": "bolder",
                  "wrap": true
                },
                {
                  "type": "TextBlock",
                  "spacing": "none",
                  "text": "Created {{DATE(2017-02-14T06:08:39Z, SHORT)}}",
                  "isSubtle": true,
                  "wrap": true
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "type": "Container",
      "items": [
        {
          "type": "TextBlock",
          "text": "Now that we have defined the main rules and features of the format, we need to produce a schema and publish it to GitHub. The schema will be the starting point of our reference documentation.",
          "wrap": true
        },
        {
          "type": "FactSet",
          "facts": [
            {
              "title": "Board:",
              "value": "Adaptive Card"
            },
            {
              "title": "List:",
              "value": "Backlog"
            },
            {
              "title": "Assigned to:",
              "value": "Matt Hidinger"
            },
            {
              "title": "Due date:",
              "value": "Not set"
            }
          ]
        }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.ShowCard",
      "title": "Comment",
      "card": {
        "type": "AdaptiveCard",
        "body": [
          {
            "type": "Input.Text",
            "id": "comment",
            "isMultiline": true,
            "placeholder": "Enter your comment"
          }
        ],
        "actions": [
          {
            "type": "Action.Submit",
            "title": "OK"
          }
        ]
      }
    },
    {
      "type": "Action.OpenUrl",
      "title": "View",
      "url": "https://adaptivecards.io"
    }
  ]
}

const query = ref('')
const result = ref<any>('')

const handleClick = async () => {
    console.log('[Six] Calling API: ', query.value)
    try {
        const response = await $fetch(`/api/six?query=${encodeURIComponent(query.value)}`)
        console.log('[Six] Done Calling: ', response)
        
        result.value = response
        
        // If you want to render API results as a new card, you could do something like:
        // renderCardFromResponse(response);
    } catch (error) {
        console.error('Error fetching data:', error);
        result.value = { error: 'Failed to fetch data' };
    }
}
</script>
