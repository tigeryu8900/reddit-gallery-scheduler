# reddit-gallery-scheduler

A Reddit scheduler for gallery posts

**Please use [reddit-scheduler](https://github.com/tigeryu8900/reddit-scheduler) instead since it supports more post
types.**

## Set up

Create a `.env` file in the project root directory in this format where `username` and `password` are the Reddit
credentials.

```dotenv
USERNAME=username
PASSWORD=password
```

Then, create the `schedule/pending` directory in the project root directory.

Now, for each scheduled post, create a folder of the format `YYYY-mm-dd HH-MM-SS` in `schedule/pending` where the folder
name corresponds to the scheduled time.

Create a JSON file at `schedule/pending/YYYY-mm-dd HH-MM-SS/data.json` in this format:

```json
{
  "subreddit": "r/subreddit",
  "title": "title",
  "images": [
    {
      "file": "1.png",
      "caption": "caption",
      "link": "https://example.com"
    },
    {
      "file": "2.png",
      "caption": null,
      "link": null
    }
  ],
  "oc": false,
  "spoiler": false,
  "nsfw": false,
  "flair": "flair",
  "comments": [
    "comment 1",
    "comment 2"
  ]
}
```

Put all the image files in `schedule/pending/YYYY-mm-dd HH-MM-SS/`, and in this case, it would be `1.png` and `2.png`.

Done events are automatically moved to `schedule/done/`.
