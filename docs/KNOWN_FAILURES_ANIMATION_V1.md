# Animation V1.0 + Bash AoE: known failing legacy tests (accepted for this release)

Recorded at feature/bash-aoe 8e51e84: `npm test` = 1429 pass, 16 fail. All 16 are tests where a bot or scripted match casts Shield Bash (or hashes its events), and the Bash AoE (120 degree cone, 6-tick lock, swing refund, cast-effect event fields) changed their outcome.

They were NOT re-baselined: no golden was re-recorded and no timing window widened. Follow-up: decide per test whether to re-record or to rebalance.

Attribution (cone limited to 1 target): fixes campaign-level-13 timing, Level 16, Breach the Front x2, Level 9; still red: Level 20 Shop order, early raid at 5 s, third Barracks bot. Goldens and hashes move for either change.

Pacing signal from the bots (perfect Bash on cooldown, an upper bound): Breach the Front 96.9 s vs window 150-240 s and 152.7 s vs 180-300 s; level 13 bot 169.6 s; scripted harness match with inert Keeps ends in victory at tick 7040 instead of running 16000 undecided; Level 16 and the early-raid bot now lose.

## Failures

### not ok 267 - campaign-13 active Guardian: a tower-focused bot wins, not instantly, with the Keep above half and the recorded tower losses
```
'finishes in a plausible time (169.6 s)'
```

### not ok 293 - Level 20 matrix: the Shop order is a real choice (Shield first wins less often than Hammer first) and no purchase runs without Gold
```
'Hammer 4, Shield 6'
```

### not ok 301 - bot, early raid at 5 s: the gate falls during the hold phase, the garrison rallies, and the hold objective still completes
```
|-
    Expected values to be strictly deep-equal:
    + actual - expected
    
      [
    +   'defeat',
    +   'azure-keep-hp-threshold'
    -   'victory',
    -   'objectives-complete'
      ]
```

### not ok 463 - the bot defends and wins with and without the third Barracks; no Commander, escort or soldier stands stuck
```
|-
    Expected values to be strictly deep-equal:
    + actual - expected
    
    + {
    +   'red-marshal-escort-2700-0': [
    +     1128,
    +     264,
    +     104.9
    +   ]
    + }
    - {}
```

### not ok 585 - Level 16 is winnable through hold then breach by an offensive bot; the front towers are reached and destroyed; replays identically
```
|-
    [["towers",2],["waves",5],["front",2]]
    + actual - expected
    
      [
    +   'defeat',
    +   'azure-keep-hp-threshold'
    -   'victory',
    -   'objectives-complete'
      ]
```

### not ok 616 - Breach the Front is won on either flank: north (front-north, front-center) or south (front-south, front-center)
```
'96.9s, expected 150-240s'
```

### not ok 617 - Breach the Front: two Archer Towers at home first is also a winning plan, and keeps the Keep whole
```
'152.7s, expected 180-300s'
```

### not ok 648 - Level 9: without Vanguard Charge the mission never completes, however long the Guardian fights, and learning it later recovers
```
|-
    [["slows",4],["wedge",3]]
    + actual - expected
    
    + null
    - {
    -   outcome: 'victory',
    -   reason: 'objectives-complete',
    -   tick: undefined
    - }
```

### not ok 732 - Full Battle replays the Stage 1 match exactly: initial state, every event, RNG and the final result
```
|-
    the pre-S0 golden match
    + actual - expected
    
      {
        ended: false,
    +   hash: '0c82176d352f11135e26394c42078c7ec1b221f227383f30e2b36d89dd743d7d',
    -   hash: '41b77edde472bbd9fa348fcab92299be719f323bcdf90c5558f5bea590fbd63f',
        result: null,
        tick: 16000,
        waves: 14
      }
```

### not ok 1011 - golden: chapter1-level-06 matches its recorded checkpoints
```
|-
    chapter1-level-06: checkpoint 33: expected 1020 cf3b249ef2aef801 3fcde277, got 1020 701566ace66ee338 3fcde277 - simulation state differs (same input)
    + actual - expected
    
    + 'checkpoint 33: expected 1020 cf3b249ef2aef801 3fcde277, got 1020 701566ace66ee338 3fcde277 - simulation state differs (same input)'
    - null
```

### not ok 1012 - golden: chapter1-level-10 matches its recorded checkpoints
```
|-
    chapter1-level-10: checkpoint 14: expected 450 b4e6c280fd75446d 33fac78b, got 450 7f87be1a706feda3 33fac78b - simulation state differs (same input)
    + actual - expected
    
    + 'checkpoint 14: expected 450 b4e6c280fd75446d 33fac78b, got 450 7f87be1a706feda3 33fac78b - simulation state differs (same input)'
    - null
```

### not ok 1013 - golden: full-battle matches its recorded checkpoints
```
|-
    full-battle: checkpoint 10: expected 330 aae9e89c74606924 63e37dda, got 330 fb9d0e12d646ff62 63e37dda - simulation state differs (same input)
    + actual - expected
    
    + 'checkpoint 10: expected 330 aae9e89c74606924 63e37dda, got 330 fb9d0e12d646ff62 63e37dda - simulation state differs (same input)'
    - null
```

### not ok 1165 - legacy encounter ids replay the pre-S0 golden matches exactly
```
|-
    Expected values to be strictly deep-equal:
    + actual - expected
    
      {
        ended: false,
    +   hash: '0c82176d352f11135e26394c42078c7ec1b221f227383f30e2b36d89dd743d7d',
    -   hash: '41b77edde472bbd9fa348fcab92299be719f323bcdf90c5558f5bea590fbd63f',
        result: null,
        tick: 16000,
        waves: 14
      }
```

### not ok 1167 - a MatchSetup builds the same initial match as its legacy encounter id and replays the same golden match
```
|-
    Expected values to be strictly deep-equal:
    + actual - expected
    
      {
        ended: false,
    +   hash: '0c82176d352f11135e26394c42078c7ec1b221f227383f30e2b36d89dd743d7d',
    -   hash: '41b77edde472bbd9fa348fcab92299be719f323bcdf90c5558f5bea590fbd63f',
        result: null,
        tick: 16000,
        waves: 14
      }
```

### not ok 1169 - harness mutations of Keep defense and waves are read when each match is constructed
```
|-
    Expected values to be strictly deep-equal:
    + actual - expected
    
      {
    +   ended: true,
    +   hash: '736c458b6def9c93713dd20f02c75cbff350f38aef6aa5709d407c590e5c3e15',
    +   result: {
    +     alliedHp: 3000,
    +     enemyHp: 0,
    +     gold: 200,
    +     kills: 22,
    +     outcome: 'victory',
    +     tick: 7040
    +   },
    +   tick: 7040,
    +   waves: 6
    -   ended: false,
    -   hash: 'eff42e4e612b708628e2df74fc33e0affffa55e0edcf859418ae58fc24b23303',
    -   result: null,
    -   tick: 16000,
    -   waves: 14
      }
```

### not ok 1170 - configuration does not leak between matches or back into shared data
```
|-
    a mid-match configuration change does not reach the running match
    + actual - expected
    
      {
        ended: false,
    +   hash: '0c82176d352f11135e26394c42078c7ec1b221f227383f30e2b36d89dd743d7d',
    -   hash: '41b77edde472bbd9fa348fcab92299be719f323bcdf90c5558f5bea590fbd63f',
        result: null,
        tick: 16000,
        waves: 14
      }
```
