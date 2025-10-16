import { parseMultiSectionCSV, parseWeeklyTeamStats, enrichWithCalculatedStats } from '../utils/csvParser';

describe('CSV Parser', () => {
  describe('parseMultiSectionCSV', () => {
    it('should parse basic offense stats correctly', () => {
      const csvContent = `Rk,Tm,G,PF,Yds,Y/P,TO
1,Arizona Cardinals,5,120,2500,5.2,8
2,Atlanta Falcons,5,95,2200,4.8,12`;

      const result = parseMultiSectionCSV(csvContent);

      expect(result['Arizona Cardinals']).toBeDefined();
      expect(result['Arizona Cardinals'].games_played).toBe(5);
      expect(result['Arizona Cardinals'].points_per_game).toBe(120);
      expect(result['Arizona Cardinals'].offensive_yards_per_game).toBe(2500);
      expect(result['Arizona Cardinals'].yards_per_play).toBe(5.2);
      expect(result['Arizona Cardinals'].turnovers_lost).toBe(8);
    });

    it('should parse passing stats section', () => {
      const csvContent = `Tm,G,Cmp,Att,Yds,TD,Int
Arizona Cardinals,5,120,180,1450,12,5
Atlanta Falcons,5,110,170,1300,8,7`;

      const result = parseMultiSectionCSV(csvContent);

      expect(result['Arizona Cardinals'].passing_yards).toBe(1450);
      expect(result['Arizona Cardinals'].passing_tds).toBe(12);
    });

    it('should parse rushing stats section', () => {
      const csvContent = `Rk,Tm,G,Att,Yds,TD,Y/A
1,Arizona Cardinals,5,150,650,5,4.3
2,Atlanta Falcons,5,140,580,3,4.1`;

      const result = parseMultiSectionCSV(csvContent);

      expect(result['Arizona Cardinals'].rushing_yards).toBe(650);
      expect(result['Arizona Cardinals'].rushing_tds).toBe(5);
    });

    it('should parse downs section with critical stats', () => {
      const csvContent = `Rk,Tm,G,3DAtt,3DConv,3D%,4DAtt,4DConv
1,Arizona Cardinals,5,45,18,40.0,5,2
2,Atlanta Falcons,5,48,15,31.3,6,1`;

      const result = parseMultiSectionCSV(csvContent);

      expect(result['Arizona Cardinals'].third_down_attempts).toBe(45);
      expect(result['Arizona Cardinals'].third_down_conversions).toBe(18);
      expect(result['Arizona Cardinals'].third_down_conversion_rate).toBe(40.0);
      expect(result['Arizona Cardinals'].fourth_down_attempts).toBe(5);
      expect(result['Arizona Cardinals'].fourth_down_conversions).toBe(2);
    });

    it('should parse red zone section', () => {
      const csvContent = `Rk,Tm,G,RZAtt,RZTD,RZPct
1,Arizona Cardinals,5,12,8,66.7
2,Atlanta Falcons,5,10,5,50.0`;

      const result = parseMultiSectionCSV(csvContent);

      expect(result['Arizona Cardinals'].red_zone_attempts).toBe(12);
      expect(result['Arizona Cardinals'].red_zone_touchdowns).toBe(8);
      expect(result['Arizona Cardinals'].red_zone_efficiency).toBe(66.7);
    });

    it('should parse drive stats section', () => {
      const csvContent = `Rk,Tm,G,#Dr,Plays,Yds,Time,PT,3DConv,3DAtt,RZAtt,RZTD
1,Arizona Cardinals,5,55,320,1800,180:30,28,18,45,12,8
2,Atlanta Falcons,5,52,310,1650,175:45,22,15,48,10,5`;

      const result = parseMultiSectionCSV(csvContent);

      expect(result['Arizona Cardinals'].drives_per_game).toBe(55);
      expect(result['Atlanta Falcons'].drives_per_game).toBe(52);
    });

    it('should handle multiple sections in one CSV', () => {
      const csvContent = `Rk,Tm,G,PF,Yds,Y/P,TO
1,Arizona Cardinals,5,120,2500,5.2,8

Tm,G,Cmp,Att,Yds,TD,Int
Arizona Cardinals,5,120,180,1450,12,5

Rk,Tm,G,Att,Yds,TD,Y/A
1,Arizona Cardinals,5,150,650,5,4.3`;

      const result = parseMultiSectionCSV(csvContent);

      // Should merge all sections
      const cardinals = result['Arizona Cardinals'];
      expect(cardinals.points_per_game).toBe(120);
      expect(cardinals.offensive_yards_per_game).toBe(2500);
      expect(cardinals.passing_yards).toBe(1450);
      expect(cardinals.passing_tds).toBe(12);
      expect(cardinals.rushing_yards).toBe(650);
      expect(cardinals.rushing_tds).toBe(5);
    });
  });

  describe('parseWeeklyTeamStats', () => {
    const mockOffenseCSV = `Rk,Tm,G,PF,Yds,Y/P,TO
1,Arizona Cardinals,5,120,2500,5.2,8
2,Atlanta Falcons,5,95,2200,4.8,12

Tm,G,Cmp,Att,Yds,TD,Int
Arizona Cardinals,5,120,180,1450,12,5
Atlanta Falcons,5,110,170,1300,8,7

Rk,Tm,G,Att,Yds,TD,Y/A
1,Arizona Cardinals,5,150,650,5,4.3
2,Atlanta Falcons,5,140,580,3,4.1

Rk,Tm,G,3DAtt,3DConv,3D%,4DAtt,4DConv
1,Arizona Cardinals,5,45,18,40.0,5,2
2,Atlanta Falcons,5,48,15,31.3,6,1

Rk,Tm,G,RZAtt,RZTD,RZPct
1,Arizona Cardinals,5,12,8,66.7
2,Atlanta Falcons,5,10,5,50.0

Rk,Tm,G,#Dr,Plays,Yds,Time,PT,3DConv,3DAtt,RZAtt,RZTD
1,Arizona Cardinals,5,55,320,1800,180:30,28,18,45,12,8
2,Atlanta Falcons,5,52,310,1650,175:45,22,15,48,10,5`;

    const mockDefenseCSV = `Rk,Tm,G,PA,Yds,Y/P,TO
1,Arizona Cardinals,5,85,2100,4.5,15
2,Atlanta Falcons,5,110,2400,5.1,10

Tm,G,Cmp,Att,Yds,TD,Int
Arizona Cardinals,5,100,160,1200,7,8
Atlanta Falcons,5,115,175,1350,9,5

Rk,Tm,G,Att,Yds,TD,Y/A
1,Arizona Cardinals,5,130,550,4,4.2
2,Atlanta Falcons,5,125,600,6,4.8`;

    it('should merge offense and defense stats', () => {
      const result = parseWeeklyTeamStats(mockOffenseCSV, mockDefenseCSV);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['Arizona Cardinals']).toBeDefined();
      expect(result['Atlanta Falcons']).toBeDefined();
    });

    it('should include all critical stats', () => {
      const result = parseWeeklyTeamStats(mockOffenseCSV, mockDefenseCSV);
      const cardinals = result['Arizona Cardinals'];

      // Offensive stats
      expect(cardinals.games_played).toBe(5);
      expect(cardinals.points_per_game).toBe(120);
      expect(cardinals.offensive_yards_per_game).toBe(2500);
      expect(cardinals.passing_yards).toBe(1450);
      expect(cardinals.passing_tds).toBe(12);
      expect(cardinals.rushing_yards).toBe(650);
      expect(cardinals.rushing_tds).toBe(5);
      expect(cardinals.drives_per_game).toBe(55);
      expect(cardinals.third_down_attempts).toBe(45);
      expect(cardinals.third_down_conversions).toBe(18);
      expect(cardinals.red_zone_attempts).toBe(12);
      expect(cardinals.red_zone_touchdowns).toBe(8);

      // Defensive stats
      expect(cardinals.points_allowed_per_game).toBe(85);
      expect(cardinals.defensive_yards_allowed).toBe(2100);
      expect(cardinals.def_passing_yards_allowed).toBe(1200);
      expect(cardinals.def_passing_tds_allowed).toBe(7);
      expect(cardinals.def_rushing_yards_allowed).toBe(550);
      expect(cardinals.def_rushing_tds_allowed).toBe(4);
    });
  });

  describe('enrichWithCalculatedStats', () => {
    it('should use NFL average for missing drives_per_game', () => {
      const stats = { games_played: 5 };
      const enriched = enrichWithCalculatedStats(stats);

      expect(enriched.drives_per_game).toBe(12);
    });

    it('should keep existing drives_per_game', () => {
      const stats = { drives_per_game: 55 };
      const enriched = enrichWithCalculatedStats(stats);

      expect(enriched.drives_per_game).toBe(55);
    });

    it('should calculate third down attempts from conversion rate', () => {
      const stats = {
        third_down_conversion_rate: 40.0,
        games_played: 5
      };
      const enriched = enrichWithCalculatedStats(stats);

      expect(enriched.third_down_attempts).toBe(13); // NFL average
      expect(enriched.third_down_conversions).toBe(5.2); // 13 * 0.4
    });

    it('should calculate red zone attempts from efficiency', () => {
      const stats = {
        red_zone_efficiency: 66.7,
        drives_per_game: 55
      };
      const enriched = enrichWithCalculatedStats(stats);

      expect(enriched.red_zone_attempts).toBeCloseTo(19.25, 1); // 55 * 0.35
      expect(enriched.red_zone_touchdowns).toBeCloseTo(12.85, 1); // 19.25 * 0.667
    });
  });

  describe('edge cases', () => {
    it('should handle empty CSV', () => {
      const result = parseMultiSectionCSV('');
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should skip invalid rows', () => {
      const csvContent = `Rk,Tm,G,PF,Yds
---,---,---,---,---
1,Arizona Cardinals,5,120,2500
Avg Team,16,85,2100`;

      const result = parseMultiSectionCSV(csvContent);

      expect(Object.keys(result)).toHaveLength(1);
      expect(result['Arizona Cardinals']).toBeDefined();
    });

    it('should handle different team name formats', () => {
      const csvContent = `Rk,Tm,G,PF,Yds
1,Arizona Cardinals,5,120,2500
2,Atlanta Falcons,5,95,2200`;

      const result = parseMultiSectionCSV(csvContent);

      expect(result['Arizona Cardinals']).toBeDefined();
      expect(result['Atlanta Falcons']).toBeDefined();
    });
  });
});