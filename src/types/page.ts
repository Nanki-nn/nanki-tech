export interface BasePageConfig {
    type: 'about' | 'publication' | 'card' | 'text';
    title: string;
    description?: string;
}

export interface PublicationPageConfig extends BasePageConfig {
    type: 'publication';
    source: string;
}

export interface TextPageConfig extends BasePageConfig {
    type: 'text';
    source: string;
}

export interface CardItem {
    title: string;
    subtitle?: string;
    date?: string;
    content?: string;
    tags?: string[];
    link?: string;
    slug?: string;
    source?: string;
    image?: string;
}

export interface CardPageConfig extends BasePageConfig {
    type: 'card';
    view?: 'cards' | 'timeline';
    more_href?: string;
    home_limit?: number;
    items: CardItem[];
}
