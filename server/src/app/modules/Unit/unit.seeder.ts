import { Unit } from './unit.model';

const defaultUnits = [
    {
        name: 'Pieces',
        abbreviation: 'pcs',
        description: 'Individual pieces or items',
        isActive: true,
    },
    {
        name: 'Box',
        abbreviation: 'box',
        description: 'Box or package',
        isActive: true,
    },
    {
        name: 'Kilogram',
        abbreviation: 'kg',
        description: 'Weight measurement in kilograms',
        isActive: true,
    },
    {
        name: 'Litre',
        abbreviation: 'litre',
        description: 'Volume measurement in litres',
        isActive: true,
    },
    {
        name: 'Pack',
        abbreviation: 'pack',
        description: 'Pack or bundle',
        isActive: true,
    },
    {
        name: 'Dozen',
        abbreviation: 'doz',
        description: 'Set of 12 items',
        isActive: true,
    },
    {
        name: 'Gram',
        abbreviation: 'g',
        description: 'Weight measurement in grams',
        isActive: true,
    },
    {
        name: 'Meter',
        abbreviation: 'm',
        description: 'Length measurement in meters',
        isActive: true,
    },
];

export const seedUnits = async () => {
    try {
        const existingUnits = await Unit.countDocuments();

        if (existingUnits === 0) {
            await Unit.insertMany(defaultUnits);
            console.log('✓ Default units seeded successfully');
        } else {
            console.log('✓ Units already exist, skipping seed');
        }
    } catch (error) {
        console.error('Error seeding units:', error);
        throw error;
    }
};

