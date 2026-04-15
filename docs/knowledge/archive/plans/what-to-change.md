---
type: plan
project: tvplotlines
status: active
date: 2026-03-23
---

# To decide 

1. add option to write synopsis for the series name provided based on onlien content using [[tvplotlines-synopsis-authoring-protocol]]? 

## Code before pass 0
1. input for the function might be complicated list [str]? what is the convention here? should i explain how to prepare the input?
## Pass 0
1. franchise type - autodetected, no reason to leave for user to provide 
2. franchise type - finalise the list with definitions in glossary 
3. also i would not kill pass 0 yet and leave it to ablation autoresearch 
4. decide if collect genre and format - does not seem we have any use of it... also genre is a free format so it will be hard to analyse consistently 
	franchise_type: str     # "procedural" | "serial" | "hybrid" | "ensemble"
    story_engine: str       # one sentence — the show's story-generation mechanism
    genre: str              # "drama", "thriller", "comedy"
    format: str | None      # "anthology" | "limited" | "ongoing"
5. usage: str                            # token usage summary - when it is calculated? how we could show the data - how much in tockens each pass costs and total sum 
6. 

## Code after Pass 0
## Pass 1

## Code after Pass 1
## Pass 2
## Code after Pass 2
## Pass 3
## Code after Pass 3

## Results 