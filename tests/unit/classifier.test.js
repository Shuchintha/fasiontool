import { describe, it, expect } from 'vitest';
import { parseClassifierOutput } from '../../app/server/services/classifier.js';

describe('parseClassifierOutput', () => {
  it('parses a complete valid response', () => {
    const input = {
      description: 'A flowing red silk dress with an empire waist and delicate embroidery.',
      garment_type: 'dress',
      style: 'romantic',
      material: 'silk',
      color_palette: ['red', 'gold'],
      pattern: 'embroidered',
      season: 'spring',
      occasion: 'evening',
      consumer_profile: 'luxury consumer',
      trend_notes: 'Revival of romantic silhouettes',
      location_continent: 'Europe',
      location_country: 'Italy',
      location_city: 'Milan',
    };

    const result = parseClassifierOutput(input, JSON.stringify(input));

    expect(result.description).toBe('A flowing red silk dress with an empire waist and delicate embroidery.');
    expect(result.garment_type).toBe('dress');
    expect(result.style).toBe('romantic');
    expect(result.material).toBe('silk');
    expect(result.color_palette).toBe('["red","gold"]');
    expect(result.pattern).toBe('embroidered');
    expect(result.season).toBe('spring');
    expect(result.occasion).toBe('evening');
    expect(result.consumer_profile).toBe('luxury consumer');
    expect(result.trend_notes).toBe('Revival of romantic silhouettes');
    expect(result.location_continent).toBe('Europe');
    expect(result.location_country).toBe('Italy');
    expect(result.location_city).toBe('Milan');
    expect(result.raw_response).toBe(JSON.stringify(input));
  });

  it('handles missing fields with defaults', () => {
    const input = {
      description: 'A jacket',
      garment_type: 'jacket',
    };

    const result = parseClassifierOutput(input, '{}');

    expect(result.description).toBe('A jacket');
    expect(result.garment_type).toBe('jacket');
    expect(result.style).toBe('Unknown');
    expect(result.material).toBe('Unknown');
    expect(result.color_palette).toBe('[]');
    expect(result.pattern).toBe('Unknown');
    expect(result.season).toBe('Unknown');
    expect(result.occasion).toBe('Unknown');
    expect(result.consumer_profile).toBe('Unknown');
    expect(result.trend_notes).toBe('');
    expect(result.location_continent).toBe('Unknown');
    expect(result.location_country).toBe('Unknown');
    expect(result.location_city).toBe('Unknown');
  });

  it('handles completely empty response', () => {
    const result = parseClassifierOutput({}, '{}');

    expect(result.description).toBe('');
    expect(result.garment_type).toBe('Unknown');
    expect(result.style).toBe('Unknown');
    expect(result.color_palette).toBe('[]');
    expect(result.raw_response).toBe('{}');
  });

  it('handles null values gracefully', () => {
    const input = {
      description: null,
      garment_type: null,
      style: null,
      material: null,
      color_palette: null,
      pattern: null,
    };

    const result = parseClassifierOutput(input, '{}');

    expect(result.description).toBe('');
    expect(result.garment_type).toBe('Unknown');
    expect(result.color_palette).toBe('[]');
  });

  it('normalizes whitespace in string fields', () => {
    const input = {
      description: '  A beautiful dress  ',
      garment_type: '  dress  ',
      style: '  casual  ',
    };

    const result = parseClassifierOutput(input, '{}');

    expect(result.garment_type).toBe('dress');
    expect(result.style).toBe('casual');
  });

  it('handles color_palette as comma-separated string', () => {
    const input = {
      color_palette: 'red, blue, green',
    };

    const result = parseClassifierOutput(input, '{}');
    const colors = JSON.parse(result.color_palette);

    expect(colors).toEqual(['red', 'blue', 'green']);
  });

  it('handles color_palette as JSON string', () => {
    const input = {
      color_palette: '["navy","white"]',
    };

    const result = parseClassifierOutput(input, '{}');
    const colors = JSON.parse(result.color_palette);

    expect(colors).toEqual(['navy', 'white']);
  });

  it('handles color_palette as array', () => {
    const input = {
      color_palette: ['black', 'silver', 'grey'],
    };

    const result = parseClassifierOutput(input, '{}');
    const colors = JSON.parse(result.color_palette);

    expect(colors).toEqual(['black', 'silver', 'grey']);
  });

  it('preserves raw_response', () => {
    const raw = '{"garment_type":"dress","extra_field":"test"}';
    const result = parseClassifierOutput({ garment_type: 'dress' }, raw);

    expect(result.raw_response).toBe(raw);
  });

  it('generates raw_response from parsed if not provided', () => {
    const input = { garment_type: 'shirt' };
    const result = parseClassifierOutput(input, undefined);

    expect(result.raw_response).toBe(JSON.stringify(input));
  });

  it('handles empty string values as Unknown', () => {
    const input = {
      garment_type: '',
      style: '   ',
      material: '',
    };

    const result = parseClassifierOutput(input, '{}');

    expect(result.garment_type).toBe('Unknown');
    expect(result.style).toBe('Unknown');
    expect(result.material).toBe('Unknown');
  });
});
