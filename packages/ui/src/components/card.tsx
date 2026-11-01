import { Card as HeroCard } from '@heroui/react';
import type { ComponentProps } from 'react';

export const Card = Object.assign(HeroCard, {
  Header: HeroCard.Header,
  Title: HeroCard.Title,
  Description: HeroCard.Description,
  Content: HeroCard.Content,
  Footer: HeroCard.Footer,
});

export const CardHeader = HeroCard.Header;
export const CardTitle = HeroCard.Title;
export const CardDescription = HeroCard.Description;
export const CardContent = HeroCard.Content;
export const CardFooter = HeroCard.Footer;

export type CardProps = ComponentProps<typeof HeroCard>;
