
> ecs-benchmark@ start /home/jakeklassen/code/packages/objecs/packages/ecs-benchmark
> node src/bench.js objecs miniplex

objecs
  packed_5        139,836 op/s
  simple_iter     80,937 op/s
  frag_iter       44,291 op/s
  entity_cycle    7,556 op/s
  add_remove      21,209 op/s

miniplex
  packed_5        180,113 op/s
  simple_iter     178,320 op/s
  frag_iter       50,361 op/s
  entity_cycle    2,176 op/s
  add_remove      2,100 op/s

| op/s | packed_5 | simple_iter | frag_iter | entity_cycle | add_remove |
| ---- | --: |--: |--: |--: |--: |
| objecs | 139,836 | 80,937 | 44,291 | 7,556 | 21,209 |
| miniplex | 180,113 | 178,320 | 50,361 | 2,176 | 2,100 |
