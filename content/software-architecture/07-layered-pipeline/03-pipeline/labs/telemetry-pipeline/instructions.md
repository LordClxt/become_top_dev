Reconstruis le pipeline de télémétrie du livre, puis **étends-le** avec une nouvelle métrique (le temps d'attente de connexion à la base) **sans modifier** les filtres existants : le nouveau testeur se place après Uptime Filter.

Chaque filtre ne parle qu'au suivant ; seul Database Output écrit dans MongoDB.
